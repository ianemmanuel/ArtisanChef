import type { FinancialReadiness, FinancialReadinessReason, ReadinessCheck } from "@repo/types/backend"
import { FINANCIAL_READINESS_REASON_LABELS } from "@repo/types/enums"
import { isEnvironmentActivatable } from "../lib/environment"
import {
  COLLECTION_CAPABILITIES,
  PAYOUT_CAPABILITIES,
  collectionCapabilityForMethodType,
  payoutCapabilityForMethodType,
} from "../providers/provider.capabilities"

/*
 * PURE financial-readiness computation — no DB, no env schema, no provider
 * registry. The rules that decide "can DailyBread operate financially in
 * this country" live here and nowhere else, so they can be unit-tested
 * exhaustively. finance.readiness.service.ts wraps this with the DB loader.
 *
 * Provider routing is capability-scoped: readiness never asks about "the
 * country's active account" (there isn't one). It asks, per capability,
 * whether a USABLE provider account is actually wired to serve it —
 * collection/payout via each payment method's own wired account, and bank
 * verification via the country-global bankVerificationProviderAccount.
 */

/** A resolved snapshot of the provider account behind a routing binding. */
export interface ReadinessAccountSnapshot {
  status: string
  /** PaymentProvider.status of the catalog entry ("ACTIVE" | "INACTIVE"). */
  providerStatus: string | null
  environment: string
  enabledCapabilities: string[]
  /** A concrete adapter is registered for this provider code. */
  adapterAvailable: boolean
  /** The account's secret alias resolves to a credential bundle. */
  credentialsResolvable: boolean
}

export interface ReadinessMethodInput {
  /** PaymentMethod.type of an ACTIVE CountryPaymentMethod. */
  type: string
  /** The provider account this method is wired to, resolved — or null if unwired. */
  account: ReadinessAccountSnapshot | null
}

export interface ReadinessInputs {
  config: {
    status: string
    currencyCode: string | null
    collectionsEnabled: boolean
    payoutsEnabled: boolean
  } | null
  currency: { status: string } | null
  /** ACTIVE INBOUND CountryPaymentMethods + their wired provider account. */
  inboundMethods: ReadinessMethodInput[]
  /** ACTIVE OUTBOUND CountryPaymentMethods + their wired provider account. */
  outboundMethods: ReadinessMethodInput[]
  /** The account bound to CountryFinancialConfig.bankVerificationProviderAccountId, resolved. */
  bankVerificationAccount: ReadinessAccountSnapshot | null
}

function check(reasons: FinancialReadinessReason[]): ReadinessCheck {
  return { ready: reasons.length === 0, reasons }
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

/**
 * The reasons a resolved provider account is not usable right now — provider
 * catalog inactive, wrong environment for the deployment, no adapter, no
 * credentials, account not ACTIVE. Empty = the account is good to call.
 */
function accountUnusableReasons(account: ReadinessAccountSnapshot): FinancialReadinessReason[] {
  const reasons: FinancialReadinessReason[] = []
  if (account.status !== "ACTIVE") reasons.push("PROVIDER_ACCOUNT_NOT_ACTIVE")
  if (account.providerStatus && account.providerStatus !== "ACTIVE") reasons.push("PROVIDER_INACTIVE")
  if (!isEnvironmentActivatable(account.environment)) reasons.push("PROVIDER_ENVIRONMENT_MISMATCH")
  if (!account.adapterAvailable) reasons.push("PROVIDER_ADAPTER_UNAVAILABLE")
  if (!account.credentialsResolvable) reasons.push("PROVIDER_CREDENTIALS_UNRESOLVED")
  return reasons
}

/** Config + currency prerequisites shared by every dimension. */
function baseReasons(input: ReadinessInputs): FinancialReadinessReason[] {
  const reasons: FinancialReadinessReason[] = []
  const { config, currency } = input

  if (!config) {
    reasons.push("FINANCIAL_CONFIG_MISSING")
    return reasons // nothing else is meaningful
  }
  if (config.status !== "ACTIVE") reasons.push("FINANCIAL_CONFIG_NOT_ACTIVE")

  if (!config.currencyCode) reasons.push("CURRENCY_NOT_CONFIGURED")
  else if (!currency) reasons.push("CURRENCY_NOT_CONFIGURED")
  else if (currency.status !== "ACTIVE") reasons.push("CURRENCY_INACTIVE")

  return reasons
}

/**
 * Shared collection/payout method-routing evaluation. Given the ACTIVE
 * methods of one direction, decides whether at least one is wired to a
 * usable provider account that enables the capability its type needs —
 * emitting the most specific reason when not.
 */
function evaluateMethodRouting(
  methods: ReadinessMethodInput[],
  allKindCapabilities: string[],
  capabilityFor: (type: string) => string | null,
  reasonNoValidMethod: FinancialReadinessReason,
  reasonNotWired: FinancialReadinessReason,
  reasonNoCapability: FinancialReadinessReason,
): FinancialReadinessReason[] {
  const reasons: FinancialReadinessReason[] = []

  // Methods whose TYPE is serviceable by a capability of this kind at all.
  const serviceable = methods.filter((m) => capabilityFor(m.type) != null)
  const wired = serviceable.filter((m) => m.account != null)

  // No active provider account behind ANY method of this direction enables
  // a capability of this kind — the "the account can't even do this" signal.
  const wiredMethods = methods.filter((m) => m.account != null)
  const anyKindCapability = wiredMethods.some((m) =>
    allKindCapabilities.some((c) => m.account!.enabledCapabilities.includes(c)),
  )
  if (wiredMethods.length > 0 && !anyKindCapability) reasons.push(reasonNoCapability)

  // Methods wired to an account that enables the SPECIFIC capability the
  // method's type needs.
  const capMatched = wired.filter((m) =>
    m.account!.enabledCapabilities.includes(capabilityFor(m.type)!),
  )
  const usable = capMatched.filter((m) => accountUnusableReasons(m.account!).length === 0)

  const firstCapMatched = capMatched[0]
  if (usable.length === 0) {
    if (!firstCapMatched) {
      if (serviceable.length > 0 && wired.length === 0) {
        reasons.push(reasonNotWired)
      } else {
        reasons.push(reasonNoValidMethod)
      }
    } else {
      // A method IS wired to a capability-matched account, but that account
      // is unhealthy — surface why (provider/env/adapter/credentials).
      reasons.push(...accountUnusableReasons(firstCapMatched.account!))
    }
  }

  return reasons
}

/** The bank-verification dimension, reused by payout when a BANK method exists. */
function bankVerificationReasons(input: ReadinessInputs): FinancialReadinessReason[] {
  const reasons = [...baseReasons(input)]
  const account = input.bankVerificationAccount
  if (!account) {
    reasons.push("PROVIDER_ACCOUNT_NOT_CONFIGURED")
    return dedupe(reasons)
  }
  if (!account.enabledCapabilities.includes("BANK_ACCOUNT_RESOLUTION")) {
    reasons.push("NO_BANK_VERIFICATION_CAPABILITY")
  }
  reasons.push(...accountUnusableReasons(account))
  return dedupe(reasons)
}

export function computeFinancialReadiness(countryId: string, input: ReadinessInputs): FinancialReadiness {
  const base = baseReasons(input)

  // ── Collection ──
  const collectionReasons: FinancialReadinessReason[] = [...base]
  if (input.config && !input.config.collectionsEnabled) collectionReasons.push("COLLECTIONS_DISABLED")
  collectionReasons.push(
    ...evaluateMethodRouting(
      input.inboundMethods,
      COLLECTION_CAPABILITIES,
      collectionCapabilityForMethodType,
      "NO_VALID_INBOUND_PAYMENT_METHOD",
      "NO_INBOUND_METHOD_WIRED_TO_PROVIDER",
      "NO_COLLECTION_CAPABILITY",
    ),
  )

  // ── Payout ──
  const payoutReasons: FinancialReadinessReason[] = [...base]
  if (input.config && !input.config.payoutsEnabled) payoutReasons.push("PAYOUTS_DISABLED")
  payoutReasons.push(
    ...evaluateMethodRouting(
      input.outboundMethods,
      PAYOUT_CAPABILITIES,
      payoutCapabilityForMethodType,
      "NO_VALID_OUTBOUND_PAYOUT_METHOD",
      "NO_OUTBOUND_METHOD_WIRED_TO_PROVIDER",
      "NO_PAYOUT_CAPABILITY",
    ),
  )
  // A BANK payout method depends on bank-account verification being routable
  // too — its provider is bound independently (never the payout provider).
  if (input.outboundMethods.some((m) => m.type === "BANK")) {
    const bankReasons = bankVerificationReasons(input)
    if (bankReasons.length > 0) payoutReasons.push("NO_BANK_VERIFICATION_CAPABILITY")
  }

  // ── Bank verification ──
  const bankVerification = check(dedupe(bankVerificationReasons(input)))

  const collection = check(dedupe(collectionReasons))
  const payout = check(dedupe(payoutReasons))
  const financiallyReady = collection.ready && payout.ready

  return {
    countryId,
    collection,
    payout,
    bankVerification,
    financiallyReady,
    reasons: dedupe([...collection.reasons, ...payout.reasons, ...bankVerification.reasons]),
  }
}

export { FINANCIAL_READINESS_REASON_LABELS } from "@repo/types/enums"

export function describeFinancialReadinessReasons(reasons: FinancialReadinessReason[]): string[] {
  return reasons.map((r) => FINANCIAL_READINESS_REASON_LABELS[r])
}
