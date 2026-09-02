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
 * exhaustively. finance.readiness.service.ts wraps this with the DB loader
 * (and resolves the two Phase 1C booleans below).
 */

export interface ReadinessMethodInput {
  /** PaymentMethod.type of an ACTIVE CountryPaymentMethod. */
  type: string
  /** Is this method wired to the country's ACTIVE provider account? (Phase 1C link) */
  wiredToActiveAccount: boolean
}

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
    /** A concrete adapter is registered for this provider code (Phase 1C). */
    adapterAvailable: boolean
    /** The account's secret alias resolves to a credential bundle (Phase 1C). */
    credentialsResolvable: boolean
  } | null
  /** ACTIVE INBOUND CountryPaymentMethods. */
  inboundMethods: ReadinessMethodInput[]
  /** ACTIVE OUTBOUND CountryPaymentMethods. */
  outboundMethods: ReadinessMethodInput[]
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
 * provider is ACTIVE, whose environment matches the deployment, that has a
 * registered adapter and resolvable credentials.
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
    if (!providerAccount.adapterAvailable) reasons.push("PROVIDER_ADAPTER_UNAVAILABLE")
    if (!providerAccount.credentialsResolvable) reasons.push("PROVIDER_CREDENTIALS_UNRESOLVED")
  }

  return reasons
}

/** Methods whose type is serviceable by a currently-enabled capability of the given kind. */
function methodsWithEnabledCapability(
  methods: ReadinessMethodInput[],
  enabled: Set<string>,
  capabilityFor: (type: string) => string | null,
): ReadinessMethodInput[] {
  return methods.filter((m) => {
    const cap = capabilityFor(m.type)
    return cap != null && enabled.has(cap)
  })
}

export function computeFinancialReadiness(countryId: string, input: ReadinessInputs): FinancialReadiness {
  const base = baseReasons(input)
  const enabled = new Set(input.providerAccount?.enabledCapabilities ?? [])

  // ── Collection ──
  const collectionReasons: FinancialReadinessReason[] = [...base]
  if (input.config && !input.config.collectionsEnabled) collectionReasons.push("COLLECTIONS_DISABLED")
  if (!COLLECTION_CAPABILITIES.some((c) => enabled.has(c))) collectionReasons.push("NO_COLLECTION_CAPABILITY")

  const usableInbound = methodsWithEnabledCapability(input.inboundMethods, enabled, collectionCapabilityForMethodType)
  if (usableInbound.length === 0) {
    collectionReasons.push("NO_VALID_INBOUND_PAYMENT_METHOD")
  } else if (!usableInbound.some((m) => m.wiredToActiveAccount)) {
    collectionReasons.push("NO_INBOUND_METHOD_WIRED_TO_PROVIDER")
  }

  // ── Payout ──
  const payoutReasons: FinancialReadinessReason[] = [...base]
  if (input.config && !input.config.payoutsEnabled) payoutReasons.push("PAYOUTS_DISABLED")
  if (!PAYOUT_CAPABILITIES.some((c) => enabled.has(c))) payoutReasons.push("NO_PAYOUT_CAPABILITY")

  const usableOutbound = methodsWithEnabledCapability(input.outboundMethods, enabled, payoutCapabilityForMethodType)
  if (usableOutbound.length === 0) {
    payoutReasons.push("NO_VALID_OUTBOUND_PAYOUT_METHOD")
  } else if (!usableOutbound.some((m) => m.wiredToActiveAccount)) {
    payoutReasons.push("NO_OUTBOUND_METHOD_WIRED_TO_PROVIDER")
  }

  // Bank payouts are the configured launch method → bank-account resolution
  // capability is also required for payout readiness.
  if (input.outboundMethods.some((m) => m.type === "BANK") && !enabled.has("BANK_ACCOUNT_RESOLUTION")) {
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
