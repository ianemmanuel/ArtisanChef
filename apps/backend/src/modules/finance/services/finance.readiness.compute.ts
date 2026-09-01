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
 * PURE financial-readiness computation — no DB, no env schema. The rules
 * that decide "can DailyBread operate financially in this country" live
 * here and nowhere else, so they can be unit-tested exhaustively.
 * finance.readiness.service.ts wraps this with the DB loader.
 */

export interface ReadinessInputs {
  config: {
    status: string
    currencyCode: string | null
    collectionsEnabled: boolean
    payoutsEnabled: boolean
  } | null
  currency: { status: string } | null
  providerAccount: {
    status: string
    environment: string
    enabledCapabilities: string[]
    providerStatus: string | null
  } | null
  /** PaymentMethod.type of every ACTIVE INBOUND CountryPaymentMethod. */
  inboundMethodTypes: string[]
  /** PaymentMethod.type of every ACTIVE OUTBOUND CountryPaymentMethod. */
  outboundMethodTypes: string[]
}

function check(reasons: FinancialReadinessReason[]): ReadinessCheck {
  return { ready: reasons.length === 0, reasons }
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

/**
 * Base prerequisites shared by every readiness dimension: an ACTIVE config
 * pointing at an ACTIVE currency and an ACTIVE provider account whose
 * provider is ACTIVE and whose environment matches the deployment.
 */
function baseReasons(input: ReadinessInputs): FinancialReadinessReason[] {
  const reasons: FinancialReadinessReason[] = []
  const { config, currency, providerAccount } = input

  if (!config) {
    reasons.push("FINANCIAL_CONFIG_MISSING")
    return reasons // nothing else is meaningful
  }
  if (config.status !== "ACTIVE") reasons.push("FINANCIAL_CONFIG_NOT_ACTIVE")

  if (!config.currencyCode) reasons.push("CURRENCY_NOT_CONFIGURED")
  else if (!currency) reasons.push("CURRENCY_NOT_CONFIGURED")
  else if (currency.status !== "ACTIVE") reasons.push("CURRENCY_INACTIVE")

  if (!providerAccount) {
    reasons.push("PROVIDER_ACCOUNT_NOT_CONFIGURED")
  } else {
    if (providerAccount.status !== "ACTIVE") reasons.push("PROVIDER_ACCOUNT_NOT_ACTIVE")
    if (providerAccount.providerStatus && providerAccount.providerStatus !== "ACTIVE") reasons.push("PROVIDER_INACTIVE")
    if (!isEnvironmentActivatable(providerAccount.environment)) reasons.push("PROVIDER_ENVIRONMENT_MISMATCH")
  }

  return reasons
}

export function computeFinancialReadiness(countryId: string, input: ReadinessInputs): FinancialReadiness {
  const base = baseReasons(input)
  const enabled = new Set(input.providerAccount?.enabledCapabilities ?? [])

  // ── Collection ──
  const collectionReasons: FinancialReadinessReason[] = [...base]
  if (input.config && !input.config.collectionsEnabled) collectionReasons.push("COLLECTIONS_DISABLED")
  if (!COLLECTION_CAPABILITIES.some((c) => enabled.has(c))) collectionReasons.push("NO_COLLECTION_CAPABILITY")
  const hasValidInbound = input.inboundMethodTypes.some((t) => {
    const cap = collectionCapabilityForMethodType(t)
    return cap != null && enabled.has(cap)
  })
  if (!hasValidInbound) collectionReasons.push("NO_VALID_INBOUND_PAYMENT_METHOD")

  // ── Payout ──
  const payoutReasons: FinancialReadinessReason[] = [...base]
  if (input.config && !input.config.payoutsEnabled) payoutReasons.push("PAYOUTS_DISABLED")
  if (!PAYOUT_CAPABILITIES.some((c) => enabled.has(c))) payoutReasons.push("NO_PAYOUT_CAPABILITY")
  const hasValidOutbound = input.outboundMethodTypes.some((t) => {
    const cap = payoutCapabilityForMethodType(t)
    return cap != null && enabled.has(cap)
  })
  if (!hasValidOutbound) payoutReasons.push("NO_VALID_OUTBOUND_PAYOUT_METHOD")
  // Bank payouts are the configured launch method → bank-account resolution
  // capability is also required for payout readiness.
  if (input.outboundMethodTypes.includes("BANK") && !enabled.has("BANK_ACCOUNT_RESOLUTION")) {
    payoutReasons.push("NO_BANK_VERIFICATION_CAPABILITY")
  }

  // ── Bank verification ──
  const bankReasons: FinancialReadinessReason[] = [...base]
  if (!enabled.has("BANK_ACCOUNT_RESOLUTION")) bankReasons.push("NO_BANK_VERIFICATION_CAPABILITY")

  const collection = check(dedupe(collectionReasons))
  const payout = check(dedupe(payoutReasons))
  const bankVerification = check(dedupe(bankReasons))
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
