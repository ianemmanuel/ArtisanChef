/*
 * The concrete Flutterwave v4 adapter. Implements the capability-segregated
 * interfaces from provider.types.ts. The finance domain gets a
 * PaymentProviderAdapter from the registry and calls capabilities on it —
 * it never imports this file, never sees a Flutterwave URL, header, payload,
 * status string or error.
 *
 * Stateless: environment + secrets arrive per call in ProviderCallContext.
 * The only cross-call state is the OAuth token cache in FlutterwaveTokenManager.
 *
 * Endpoints (v4, verified against developer.flutterwave.com):
 *   collection : POST /orchestration/direct-charges , GET /charges/{id}
 *   refunds    : POST /refunds                       , GET /refunds/{id}
 *   payouts    : POST /direct-transfers              , GET /transfers/{id}
 */

import { randomUUID } from "node:crypto"
import type { Money } from "../../lib/money"
import { money } from "../../lib/money"
import { ProviderError, categoryForHttpStatus, type ProviderErrorCategory } from "../provider.errors"
import type {
  PaymentProviderAdapter,
  ProviderCallContext,
  PaymentCollectionCapability,
  RefundCapability,
  PayoutCapability,
  WebhookCapability,
  BankAccountResolutionCapability,
  BankListCapability,
  CreateChargeInput,
  ChargePaymentMethod,
  RefundInput,
  CreatePayoutInput,
  ResolveBankAccountInput,
  ListBanksInput,
  NormalizedTransaction,
  NormalizedPayout,
  NormalizedRefund,
  NormalizedBankAccount,
  NormalizedBank,
  NormalizedNextAction,
} from "../provider.types"
import type { ProviderCapability } from "../provider.capabilities"
import { fetchFlutterwaveHttpClient, type FlutterwaveHttpClient } from "./flutterwave.http"
import { FlutterwaveTokenManager } from "./flutterwave.token"
import { readFlutterwaveCredentials, type FlutterwaveCredentials } from "./flutterwave.credentials"
import { flutterwaveAmountToMoney, moneyToFlutterwaveAmount } from "./flutterwave.money"
import { mapChargeStatus, mapPayoutStatus, mapRefundStatus } from "./flutterwave.mappers"
import { verifyFlutterwaveSignature, parseFlutterwaveEvent } from "./flutterwave.webhook"
import { FLUTTERWAVE_PROVIDER_CODE, FLUTTERWAVE_API_BASE_URL } from "./flutterwave.constants"

const CAPABILITIES: ProviderCapability[] = [
  "COLLECTION_CARD",
  "COLLECTION_MOBILE_MONEY",
  "COLLECTION_BANK_TRANSFER",
  "REFUND",
  "PAYOUT_BANK",
  "BANK_ACCOUNT_RESOLUTION",
  "BANK_LIST",
  "WEBHOOKS",
]

/** Bank lists change essentially never — cached in-memory per environment +
 *  country, same "Map + expiry timestamp" shape as FlutterwaveTokenManager's
 *  token cache (flutterwave.token.ts), for the same reason: avoid a
 *  provider round trip on every vendor's setup-page visit without any new
 *  infra. Per-adapter-instance (the registry holds one adapter instance),
 *  not global/module-level. */
const BANK_LIST_CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

export interface FlutterwaveAdapterDeps {
  http?: FlutterwaveHttpClient
  tokenManager?: FlutterwaveTokenManager
}

interface ApiCall {
  method: "GET" | "POST" | "PUT"
  path: string
  json?: unknown
  idempotencyKey?: string
}

/**
 * Flutterwave v4 requires X-Trace-Id to be 12–255 chars. A caller trace id
 * outside that range (or absent) is replaced with a fresh uuid (36 chars).
 */
function normaliseTraceId(traceId?: string): string {
  return traceId && traceId.length >= 12 && traceId.length <= 255 ? traceId : randomUUID()
}

//* ─── Error-envelope handling ────────────────────────────────────────────
/* v4 error body: { status: "failed", error: { type, code, message, validation_errors? } } */

const ERROR_TYPE_CATEGORY: Record<string, ProviderErrorCategory> = {
  REQUEST_NOT_VALID: "INVALID_REQUEST",
  VALIDATION_ERROR: "INVALID_REQUEST",
  RESOURCE_CONFLICT: "INVALID_REQUEST",
  RESOURCE_NOT_FOUND: "INVALID_REQUEST",
  UNAUTHORIZED: "AUTHENTICATION",
  FORBIDDEN: "AUTHENTICATION",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT",
  TRANSACTION_FAILED: "TRANSACTION_DECLINED",
  CHARGE_FAILED: "TRANSACTION_DECLINED",
}

function readErrorEnvelope(status: number, body: unknown): ProviderError {
  const b = (body ?? {}) as Record<string, unknown>
  const err = (b.error ?? {}) as Record<string, unknown>
  const type = typeof err.type === "string" ? err.type : undefined
  const parts: string[] = []
  if (typeof err.message === "string" && err.message) parts.push(err.message)
  const ve = Array.isArray(err.validation_errors) ? (err.validation_errors as Array<Record<string, unknown>>) : []
  for (const v of ve.slice(0, 3)) {
    const f = typeof v.field_name === "string" ? v.field_name : "field"
    const m = typeof v.message === "string" ? v.message : "invalid"
    parts.push(`${f}: ${m}`)
  }
  const providerMessage = parts.join("; ") || type || undefined
  const category = (type && ERROR_TYPE_CATEGORY[type]) || categoryForHttpStatus(status)

  return new ProviderError(category, `Flutterwave API error (${status})`, FLUTTERWAVE_PROVIDER_CODE, {
    httpStatus: status,
    providerMessage,
  })
}

class FlutterwaveClient {
  constructor(
    private readonly http: FlutterwaveHttpClient,
    private readonly tokens: FlutterwaveTokenManager,
  ) {}

  private baseUrl(ctx: ProviderCallContext, creds: FlutterwaveCredentials): string {
    return (creds.baseUrl || FLUTTERWAVE_API_BASE_URL[ctx.environment]).replace(/\/+$/, "")
  }

  /** Make one authenticated call, returning the `data` object or throwing a ProviderError. */
  async call(ctx: ProviderCallContext, call: ApiCall): Promise<Record<string, unknown>> {
    const creds = readFlutterwaveCredentials(ctx.secrets)
    const traceId = normaliseTraceId(ctx.traceId)
    const token = await this.tokens.getToken(creds, traceId)

    const headers: Record<string, string> = {
      authorization: `Bearer ${token}`,
      "x-trace-id": traceId,
    }
    if (call.idempotencyKey) headers["x-idempotency-key"] = call.idempotencyKey

    const res = await this.http.request({
      method: call.method,
      url: `${this.baseUrl(ctx, creds)}${call.path}`,
      headers,
      json: call.json,
    })

    if (res.status >= 200 && res.status < 300) {
      const body = (res.body ?? {}) as Record<string, unknown>
      return (body.data ?? body) as Record<string, unknown>
    }

    throw readErrorEnvelope(res.status, res.body)
  }
}

//* ─── Normalization helpers ──────────────────────────────────────────────

/** v4 amounts appear either as a plain major-unit number, or as { value, applies_to } (transfers). */
function readAmountValue(raw: unknown): number | string | undefined {
  if (raw == null) return undefined
  if (typeof raw === "number" || typeof raw === "string") return raw
  if (typeof raw === "object" && "value" in (raw as Record<string, unknown>)) {
    return (raw as Record<string, unknown>).value as number | string
  }
  return undefined
}

function readMoney(data: Record<string, unknown>, fallback?: Money): Money {
  const amount = readAmountValue(data.amount ?? data.charged_amount ?? data.amount_refunded)
  const currency =
    (data.currency as string | undefined) ??
    (data.currency_code as string | undefined) ??
    (data.destination_currency as string | undefined) ??
    (data.source_currency as string | undefined)
  if (amount != null && typeof currency === "string") {
    return flutterwaveAmountToMoney(amount, currency)
  }
  return fallback ?? money(0, typeof currency === "string" ? currency.toUpperCase() : "USD")
}

function readNextAction(data: Record<string, unknown>): NormalizedNextAction | undefined {
  const na = data.next_action as Record<string, unknown> | undefined
  if (!na) {
    const link = (data.redirect_url ?? data.link ?? data.payment_link ?? data.checkout_url) as string | undefined
    return typeof link === "string" ? { type: "REDIRECT", redirectUrl: link } : undefined
  }
  const type = String(na.type ?? "").toLowerCase()

  if (type.includes("redirect") || na.redirect_url) {
    // v4: next_action.redirect_url is { url: "..." }
    const ru = na.redirect_url as Record<string, unknown> | string | undefined
    const url = typeof ru === "string" ? ru : typeof ru?.url === "string" ? (ru.url as string) : undefined
    return { type: "REDIRECT", redirectUrl: url }
  }
  if (type.includes("instruction") || na.payment_instruction) {
    const pi = na.payment_instruction as Record<string, unknown> | string | undefined
    const instruction = typeof pi === "string" ? pi : typeof pi?.note === "string" ? (pi.note as string) : undefined
    return { type: "PAYMENT_INSTRUCTION", instruction }
  }
  return { type: "NONE" }
}

function providerRefOf(data: Record<string, unknown>): string {
  const ref = data.id ?? data.flw_ref ?? data.reference
  return ref != null ? String(ref) : ""
}

/** v4 charge carries `fees: [{ type, amount }]` in major units of the charge currency. */
function readFee(data: Record<string, unknown>, amount: Money): Money | undefined {
  if (!Array.isArray(data.fees)) return undefined
  let totalMinor = 0
  for (const f of data.fees as Array<Record<string, unknown>>) {
    const v = readAmountValue(f.amount)
    if (v != null && Number.isFinite(Number(v))) {
      totalMinor += flutterwaveAmountToMoney(v, amount.currency).amountMinor
    }
  }
  return totalMinor > 0 ? money(totalMinor, amount.currency) : undefined
}

function normalizeTransaction(data: Record<string, unknown>, expected?: Money): NormalizedTransaction {
  const amount = readMoney(data, expected)
  return {
    providerRef: providerRefOf(data),
    reference: typeof data.reference === "string" ? data.reference : undefined,
    status: mapChargeStatus(data.status ?? data.state),
    amount,
    fee: readFee(data, amount),
    nextAction: readNextAction(data),
    providerMessage:
      typeof data.processor_response === "string"
        ? data.processor_response
        : typeof data.message === "string"
          ? data.message
          : undefined,
  }
}

function normalizePayout(data: Record<string, unknown>, expected?: Money): NormalizedPayout {
  return {
    providerRef: providerRefOf(data),
    reference: typeof data.reference === "string" ? data.reference : undefined,
    status: mapPayoutStatus(data.status ?? data.state),
    amount: readMoney(data, expected),
    providerMessage:
      typeof data.complete_message === "string"
        ? data.complete_message
        : typeof data.message === "string"
          ? data.message
          : undefined,
  }
}

function normalizeRefund(data: Record<string, unknown>, expected?: Money): NormalizedRefund {
  return {
    providerRef: providerRefOf(data),
    status: mapRefundStatus(data.status ?? data.state),
    amount: readMoney(data, expected),
    providerMessage: typeof data.message === "string" ? data.message : undefined,
  }
}

/** POST /banks/account-resolve response: { data: { bank_code, account_number, account_name } }. */
function normalizeBankAccount(data: Record<string, unknown>, fallback: ResolveBankAccountInput): NormalizedBankAccount {
  return {
    accountNumber: typeof data.account_number === "string" ? data.account_number : fallback.accountNumber,
    accountName  : typeof data.account_name === "string" ? data.account_name : "",
    bankCode     : typeof data.bank_code === "string" ? data.bank_code : fallback.bankCode,
  }
}

/** GET /banks response: { data: [{ id, code, name }] }. `code` — not `id` —
 *  is what /banks/account-resolve and /direct-transfers expect back as
 *  bankCode; `id` is a Flutterwave-internal handle this adapter never
 *  surfaces (kept provider-internal, per the ownership boundary). */
function normalizeBankList(data: unknown): NormalizedBank[] {
  if (!Array.isArray(data)) return []
  const out: NormalizedBank[] = []
  for (const entry of data) {
    const e = entry as Record<string, unknown>
    if (typeof e.code === "string" && typeof e.name === "string" && e.code && e.name) {
      out.push({ code: e.code, name: e.name })
    }
  }
  return out
}

//* ─── Request builders ───────────────────────────────────────────────────

function buildCustomer(input: CreateChargeInput): Record<string, unknown> {
  const customer: Record<string, unknown> = { email: input.customerEmail }
  if (input.customerName) {
    const bits = input.customerName.trim().split(/\s+/)
    customer.name = { first: bits[0], last: bits.length > 1 ? bits.slice(1).join(" ") : bits[0] }
  }
  if (input.customerPhone) {
    const digits = input.customerPhone.replace(/[^\d]/g, "")
    // best-effort split — most African dialing codes are 3 digits
    customer.phone = { country_code: digits.slice(0, digits.length - 9), number: digits.slice(-9) }
  }
  return customer
}

function buildPaymentMethod(pm: ChargePaymentMethod): Record<string, unknown> {
  switch (pm.type) {
    case "MOBILE_MONEY":
      return {
        type: "mobile_money",
        mobile_money: { country_code: pm.countryCode, network: pm.network, phone_number: pm.phoneNumber },
      }
    case "CARD":
      return { type: "card", card: pm.encrypted }
    case "BANK_TRANSFER":
      return { type: "bank_transfer" }
  }
}

//* ─── Adapter ────────────────────────────────────────────────────────────

export function createFlutterwaveAdapter(deps: FlutterwaveAdapterDeps = {}): PaymentProviderAdapter {
  const http = deps.http ?? fetchFlutterwaveHttpClient
  const tokens = deps.tokenManager ?? new FlutterwaveTokenManager(http)
  const client = new FlutterwaveClient(http, tokens)

  const collection: PaymentCollectionCapability = {
    async createCharge(ctx, input: CreateChargeInput): Promise<NormalizedTransaction> {
      const data = await client.call(ctx, {
        method: "POST",
        path: "/orchestration/direct-charges",
        idempotencyKey: input.reference,
        json: {
          reference: input.reference,
          currency: input.amount.currency,
          amount: moneyToFlutterwaveAmount(input.amount),
          redirect_url: input.redirectUrl,
          customer: buildCustomer(input),
          payment_method: buildPaymentMethod(input.paymentMethod),
          meta: input.metadata,
        },
      })
      return normalizeTransaction(data, input.amount)
    },

    async verifyCharge(ctx, providerRef: string): Promise<NormalizedTransaction> {
      const data = await client.call(ctx, { method: "GET", path: `/charges/${encodeURIComponent(providerRef)}` })
      return normalizeTransaction(data)
    },
  }

  const refunds: RefundCapability = {
    async refund(ctx, input: RefundInput): Promise<NormalizedRefund> {
      const data = await client.call(ctx, {
        method: "POST",
        path: "/refunds",
        idempotencyKey: `refund_${input.providerRef}_${input.amount.amountMinor}`,
        json: {
          charge_id: input.providerRef,
          amount: moneyToFlutterwaveAmount(input.amount),
          // v4 enum: duplicate | fraudulent | requested_by_customer | expired_uncaptured_charge
          reason: "requested_by_customer",
          ...(input.reason ? { meta: { note: input.reason } } : {}),
        },
      })
      return normalizeRefund(data, input.amount)
    },

    async getRefund(ctx, providerRef: string): Promise<NormalizedRefund> {
      const data = await client.call(ctx, { method: "GET", path: `/refunds/${encodeURIComponent(providerRef)}` })
      return normalizeRefund(data)
    },
  }

  const payouts: PayoutCapability = {
    /*
     * v4 bank transfer. Shape per developer.flutterwave.com (docs +
     * reference) and sandbox validation probing: a top-level `type` ∈
     * [bank, wallet, mobile_money, cash_pickup] and `action` are required,
     * and the money/recipient live under `payment_instruction`.
     *
     * PROVISIONAL — not yet exercised end-to-end. A real transfer needs a
     * funded sandbox balance and is a payout-phase concern (V1 has no payout
     * run). The payout phase must confirm inline recipient vs a pre-created
     * `recipient_id` against a funded sandbox before this is used for real.
     * Everything else in this adapter IS verified live.
     */
    async createPayout(ctx, input: CreatePayoutInput): Promise<NormalizedPayout> {
      const data = await client.call(ctx, {
        method: "POST",
        path: "/direct-transfers",
        idempotencyKey: input.reference,
        json: {
          type: "bank", // V1 vendor payouts are bank-only
          action: "instant",
          reference: input.reference,
          narration: input.narration,
          payment_instruction: {
            source_currency: input.amount.currency,
            destination_currency: input.amount.currency,
            amount: { value: moneyToFlutterwaveAmount(input.amount), applies_to: "destination_currency" },
            recipient: {
              name: input.destination.accountName,
              bank: {
                code: input.destination.bankCode,
                account_number: input.destination.accountNumber,
              },
            },
          },
        },
      })
      return normalizePayout(data, input.amount)
    },

    async verifyPayout(ctx, providerRef: string): Promise<NormalizedPayout> {
      const data = await client.call(ctx, { method: "GET", path: `/transfers/${encodeURIComponent(providerRef)}` })
      return normalizePayout(data)
    },
  }

  const webhooks: WebhookCapability = {
    verifySignature: verifyFlutterwaveSignature,
    parseEvent: parseFlutterwaveEvent,
  }

  /*
   * v4 Bank Account Look Up (developer.flutterwave.com/reference/bank_account_resolve_post):
   * POST /banks/account-resolve, body discriminated by `currency`. The
   * request shape below is the common NGN/GHS/UGX/KES-style minimal form
   * ({ currency, account: { code, number } }) — the only shape Vendor 1D
   * needs (a bank code + account number, no personal/corporate discriminator
   * fields like GBP requires). A currency whose resolve request needs more
   * than that isn't reachable yet — the caller (Finance's gateway) doesn't
   * offer a way to supply it, so extending this is the next currency's job,
   * not a speculative addition now. No idempotency key: this is a read-only
   * lookup, not a state-changing operation.
   */
  const bankResolution: BankAccountResolutionCapability = {
    async resolveBankAccount(ctx, input: ResolveBankAccountInput): Promise<NormalizedBankAccount> {
      const data = await client.call(ctx, {
        method: "POST",
        path: "/banks/account-resolve",
        json: {
          currency: input.currency,
          account: { code: input.bankCode, number: input.accountNumber },
        },
      })
      return normalizeBankAccount(data, input)
    },
  }

  const bankListCache = new Map<string, { banks: NormalizedBank[]; expiresAt: number }>()

  /*
   * v4 Retrieve Banks (developer.flutterwave.com/reference/banks_get):
   * GET /banks?country={ISO2}. No idempotency key — a read. Cached
   * in-memory per environment+country (see BANK_LIST_CACHE_TTL_MS above).
   */
  const bankList: BankListCapability = {
    async listBanks(ctx, input: ListBanksInput): Promise<NormalizedBank[]> {
      const cacheKey = `${ctx.environment}::${input.countryCode.toUpperCase()}`
      const cached = bankListCache.get(cacheKey)
      if (cached && Date.now() < cached.expiresAt) return cached.banks

      const data = await client.call(ctx, {
        method: "GET",
        path  : `/banks?country=${encodeURIComponent(input.countryCode.toUpperCase())}`,
      })
      // The v4 envelope for a list endpoint is { data: [...] } — client.call
      // already unwraps `body.data`, so `data` here IS the array itself.
      const banks = normalizeBankList(data)
      bankListCache.set(cacheKey, { banks, expiresAt: Date.now() + BANK_LIST_CACHE_TTL_MS })
      return banks
    },
  }

  return {
    code: FLUTTERWAVE_PROVIDER_CODE,
    capabilities: new Set<ProviderCapability>(CAPABILITIES),
    collection,
    refunds,
    payouts,
    bankResolution,
    bankList,
    webhooks,
  }
}
