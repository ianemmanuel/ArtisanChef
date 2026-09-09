/*
 * Payment-provider abstraction — the CONTRACTS every part of the finance
 * domain depends on. No part of the domain ever sees a Flutterwave / Stripe
 * SDK, payload, header, status string or error — only the normalized types
 * and capability interfaces in this file.
 *
 * Capability-segregated: an adapter implements only the sub-interfaces it
 * supports (the rest are `undefined`). Nothing forces a card-only PSP to
 * stub a mobile-money payout.
 *
 * Phase 1A shipped these as shapes only. Phase 1C adds `ProviderCallContext`
 * (below) — the per-call bundle of resolved environment + secrets the
 * finance service passes in, so an adapter can stay stateless and never
 * read env or the DB itself. This is a refinement of the Phase 1A method
 * signatures, not a redesign: the segregation, the normalized types and the
 * registry are all unchanged.
 */

import type { Money } from "../lib/money"
import type { ProviderCapability } from "./provider.capabilities"

//* ─── Per-call context ───────────────────────────────────────────────────
/*
 * Everything an adapter needs to make one authenticated call, resolved by
 * the finance domain (finance.providerGateway.service.ts) from the country's
 * active CountryProviderAccount:
 *   - `environment` comes from the provider account (TEST | LIVE) — the
 *     adapter maps it to the provider's own sandbox/live host. Never
 *     hard-coded in the adapter.
 *   - `secrets` is the resolved bundle from ProviderSecretsResolver, keyed
 *     by the alias on the account. The adapter reads only the keys it needs
 *     and never logs them.
 *   - `traceId` is an optional correlation id echoed to the provider where
 *     supported (Flutterwave: X-Trace-Id) and into our own logs.
 */
export type ProviderEnvironment = "TEST" | "LIVE"

export interface ProviderCallContext {
  environment: ProviderEnvironment
  secrets: Record<string, string>
  traceId?: string
}

//* ─── Normalized boundary types ──────────────────────────────────────────
//* The finance domain only ever sees these — never a provider payload.

export type NormalizedTransactionStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"

export type NormalizedPayoutStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "REVERSED"

export type NormalizedRefundStatus = "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED"

/** Where the customer must be sent to complete an initiated charge. */
export interface NormalizedNextAction {
  type: "REDIRECT" | "PAYMENT_INSTRUCTION" | "NONE"
  /** For REDIRECT — the URL to send the customer to. */
  redirectUrl?: string
  /** For PAYMENT_INSTRUCTION — a short human instruction (e.g. "Approve the M-Pesa prompt"). */
  instruction?: string
}

export interface NormalizedTransaction {
  /** The provider's own id for this charge — the handle for later verification. */
  providerRef: string
  /** The reference WE supplied (idempotency + correlation), echoed back when available. */
  reference?: string
  status: NormalizedTransactionStatus
  amount: Money
  /** Provider-reported fee, if any. */
  fee?: Money
  nextAction?: NormalizedNextAction
  /** Safe, non-secret provider status detail — for audit/support, not business logic. */
  providerMessage?: string
}

export interface NormalizedPayout {
  providerRef: string
  reference?: string
  status: NormalizedPayoutStatus
  amount: Money
  fee?: Money
  providerMessage?: string
}

export interface NormalizedRefund {
  providerRef: string
  status: NormalizedRefundStatus
  amount: Money
  providerMessage?: string
}

export interface NormalizedBankAccount {
  accountNumber: string
  accountName: string
  bankCode: string
  bankName?: string
}

export type NormalizedWebhookEventType =
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "PAYOUT_PAID"
  | "PAYOUT_FAILED"
  | "REFUND_SUCCEEDED"
  | "REFUND_FAILED"
  | "UNKNOWN"

export interface NormalizedWebhookEvent {
  type: NormalizedWebhookEventType
  /** Provider id of the affected transaction/payout/refund, when resolvable. */
  providerRef: string | null
  /** Provider's event id — the idempotency key. */
  providerEventId: string | null
  /** Provider-reported status token, normalized where possible — advisory. */
  providerStatus?: string
  amount?: Money
  occurredAt?: Date
  /** The untouched provider payload — persisted for audit/replay ONLY, never
   *  consumed by business logic. */
  raw: unknown
}

//* ─── Capability interfaces ──────────────────────────────────────────────

/**
 * The payment instrument for a charge, provider-neutral. The adapter maps it
 * to the provider's own representation. Populated by the customer checkout
 * flow (a later phase) — Phase 1C only defines the shape and the mapping.
 */
export type ChargePaymentMethod =
  | {
      type: "MOBILE_MONEY"
      /** Dialing code without '+', e.g. "254". */
      countryCode: string
      /** Provider-recognised network token, e.g. "MPESA", "AIRTEL". */
      network: string
      /** Local subscriber number, no country code. */
      phoneNumber: string
    }
  | {
      type: "CARD"
      /** Already-encrypted card fields as the provider requires them. */
      encrypted: Record<string, string>
    }
  | { type: "BANK_TRANSFER" }

export interface CreateChargeInput {
  amount: Money
  /** Internal reference the provider must echo back (idempotency + correlation). */
  reference: string
  /** Required by every provider we model. */
  customerEmail: string
  /** "First Last" — the adapter splits it if the provider wants structured names. */
  customerName?: string
  /** Full international phone, e.g. "+254712345678". */
  customerPhone?: string
  /** Where the provider should return the customer after an off-site step. */
  redirectUrl?: string
  paymentMethod: ChargePaymentMethod
  metadata?: Record<string, string>
}

export interface PaymentCollectionCapability {
  createCharge(ctx: ProviderCallContext, input: CreateChargeInput): Promise<NormalizedTransaction>
  /** Authoritative status check — an initiated charge is NEVER assumed final. */
  verifyCharge(ctx: ProviderCallContext, providerRef: string): Promise<NormalizedTransaction>
}

export interface RefundInput {
  providerRef: string
  amount: Money
  reason?: string
}

export interface RefundCapability {
  refund(ctx: ProviderCallContext, input: RefundInput): Promise<NormalizedRefund>
  getRefund(ctx: ProviderCallContext, providerRef: string): Promise<NormalizedRefund>
}

export interface CreatePayoutInput {
  amount: Money
  reference: string
  destination: {
    bankCode: string
    accountNumber: string
    accountName: string
    /** Provider bank branch code — required by some provider/country/bank
     *  combinations (e.g. Ghana), absent for most (e.g. Kenya). The adapter
     *  includes it in the transfer request only when present. Branch
     *  DISCOVERY (listing a bank's branches) is a separate capability,
     *  deferred to the payout-execution phase — nothing populates this yet. */
    branchCode?: string
  }
  narration?: string
}

export interface PayoutCapability {
  createPayout(ctx: ProviderCallContext, input: CreatePayoutInput): Promise<NormalizedPayout>
  verifyPayout(ctx: ProviderCallContext, providerRef: string): Promise<NormalizedPayout>
}

export interface ResolveBankAccountInput {
  bankCode: string
  accountNumber: string
  /** ISO 4217 alpha code — some providers' bank-account-resolve request is
   *  currency-discriminated (Flutterwave: field shape differs NGN vs GBP vs
   *  USD). */
  currency: string
  /** ISO 3166-1 alpha-2 of the account's country. Provider-agnostic (it's
   *  the vendor's own country); the Finance gateway fills it from the routed
   *  provider account's country. Some providers key their account-validation
   *  request on country rather than currency (dLocal: `country` is a required
   *  field and each country has its own field/format requirements) — those
   *  adapters read this; Flutterwave ignores it. */
  countryCode: string
}

export interface BankAccountResolutionCapability {
  resolveBankAccount(ctx: ProviderCallContext, input: ResolveBankAccountInput): Promise<NormalizedBankAccount>
}

//* ─── Vendor 1E — bank discovery ─────────────────────────────────────────

/** A provider's own bank entry, normalized. `code` is what the SAME
 *  provider's other capabilities (BankAccountResolutionCapability,
 *  PayoutCapability) expect back as `bankCode` — one bank identifier,
 *  reused end to end, never re-derived from a display name. */
export interface NormalizedBank {
  code: string
  name: string
}

export interface ListBanksInput {
  /** ISO 3166-1 alpha-2, e.g. "KE". */
  countryCode: string
}

export interface BankListCapability {
  listBanks(ctx: ProviderCallContext, input: ListBanksInput): Promise<NormalizedBank[]>
}

export interface WebhookCapability {
  /**
   * Verify the provider's signature over the EXACT raw request body.
   * Pure and side-effect free so it's independently testable — the caller
   * supplies the signing secret (resolved from the matching provider
   * account) and the raw body/headers.
   */
  verifySignature(rawBody: string, headers: Record<string, string | undefined>, signingSecret: string): boolean
  /** Parse a verified raw body into a normalized event. Never called before verifySignature passes. */
  parseEvent(rawBody: string): NormalizedWebhookEvent
}

//* ─── Adapter ────────────────────────────────────────────────────────────

/**
 * A concrete provider implementation. Declares its capability set and
 * exposes ONLY the sub-interfaces it actually supports. Stateless — all
 * per-call config + secrets arrive via ProviderCallContext; the adapter
 * never reads env or the DB.
 */
export interface PaymentProviderAdapter {
  readonly code: string
  readonly capabilities: ReadonlySet<ProviderCapability>

  /**
   * The secret-bundle keys this adapter's credential reader needs to make
   * ANY authenticated call (e.g. Flutterwave: clientId + clientSecret).
   * Case-insensitive. The adapter owns this — it's the same knowledge its
   * credential reader encodes — so the generic ProviderSecretsResolver never
   * learns provider key names. Used for a no-network "are the resolved
   * credentials actually complete?" check (finance.providerGateway.service):
   * a partial bundle (only the id, say) must not read as "resolvable".
   */
  readonly requiredSecretKeys?: readonly string[]

  collection?: PaymentCollectionCapability
  refunds?: RefundCapability
  payouts?: PayoutCapability
  bankResolution?: BankAccountResolutionCapability
  bankList?: BankListCapability
  webhooks?: WebhookCapability
}
