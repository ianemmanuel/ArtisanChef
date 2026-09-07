/*
 * The capability vocabulary + coherence rules for the PaymentProvider
 * catalog. Pure and dependency-free so the invariants stay unit-testable.
 *
 * These string literals MUST match the Prisma `PaymentProviderCapability`
 * enum and `@repo/types` `PaymentProviderCapability` — kept in sync by
 * hand (same convention this repo uses elsewhere for mirrored enums). The
 * PROVIDER_CAPABILITIES array below is the single in-module source used
 * for validation.
 */

export const PROVIDER_CAPABILITIES = [
  "COLLECTION_CARD",
  "COLLECTION_MOBILE_MONEY",
  "COLLECTION_BANK_TRANSFER",
  "REFUND",
  "BANK_ACCOUNT_RESOLUTION",
  "PAYOUT_BANK",
  "PAYOUT_MOBILE_MONEY",
  "WEBHOOKS",
  // Vendor 1E — list a provider's supported banks for a country. Auxiliary
  // (doesn't itself act on a payment), so deliberately NOT added to
  // METHOD_TYPE_REQUIRES below.
  "BANK_LIST",
] as const

export type ProviderCapability = (typeof PROVIDER_CAPABILITIES)[number]

/*
 * Two kinds of capability, and the admin only ever decides one of them:
 *
 *  - BUSINESS: "does this country collect card payments / pay vendors by
 *    bank / …" — a real country-operations decision the admin makes.
 *  - INTEGRATION: webhook processing, the provider's bank directory, the
 *    provider's account-verification mechanism — these are how the
 *    integration works, not a business choice. They come automatically
 *    from whatever the selected provider's adapter implements; the admin
 *    never toggles them.
 *
 * Union === PROVIDER_CAPABILITIES (asserted in the test).
 */
export const INTEGRATION_CAPABILITIES = [
  "WEBHOOKS",
  "BANK_LIST",
  "BANK_ACCOUNT_RESOLUTION",
] as const satisfies readonly ProviderCapability[]

export const BUSINESS_CAPABILITIES = [
  "COLLECTION_CARD",
  "COLLECTION_MOBILE_MONEY",
  "COLLECTION_BANK_TRANSFER",
  "REFUND",
  "PAYOUT_BANK",
  "PAYOUT_MOBILE_MONEY",
] as const satisfies readonly ProviderCapability[]

const INTEGRATION_SET: ReadonlySet<string> = new Set(INTEGRATION_CAPABILITIES)
const BUSINESS_SET: ReadonlySet<string> = new Set(BUSINESS_CAPABILITIES)

export function isIntegrationCapability(value: string): value is (typeof INTEGRATION_CAPABILITIES)[number] {
  return INTEGRATION_SET.has(value)
}

export function isBusinessCapability(value: string): value is (typeof BUSINESS_CAPABILITIES)[number] {
  return BUSINESS_SET.has(value)
}

/*
 * How a capability is routed to a concrete CountryProviderAccount. Provider
 * routing is capability-scoped and explicit — there is no "the country's
 * active/primary account" and no fallback:
 *
 *  - "BANK_VERIFICATION": the two country-global bank-account capabilities
 *    (resolution + directory) route through
 *    CountryFinancialConfig.bankVerificationProviderAccountId. They are one
 *    provider by nature (you pick a bank from provider X's directory, then
 *    verify it with provider X), bound independently of collection/payout.
 *  - "PAYMENT_METHOD": every method-specific business capability
 *    (collection / payout / refund) routes through a specific
 *    CountryPaymentMethod.countryProviderAccountId — the caller MUST supply
 *    a countryPaymentMethodId; it is never guessed.
 *  - "UNROUTABLE": WEBHOOKS is not a single-account concept — the inbound
 *    webhook handler verifies a signature against every non-disabled account
 *    for the provider, so it is not resolvable through the gateway.
 */
export type ProviderRouteClass = "BANK_VERIFICATION" | "PAYMENT_METHOD" | "UNROUTABLE"

const BANK_VERIFICATION_ROUTE_CAPS: ReadonlySet<ProviderCapability> = new Set<ProviderCapability>([
  "BANK_ACCOUNT_RESOLUTION",
  "BANK_LIST",
])

export function providerRouteClassFor(capability: ProviderCapability): ProviderRouteClass {
  if (capability === "WEBHOOKS") return "UNROUTABLE"
  if (BANK_VERIFICATION_ROUTE_CAPS.has(capability)) return "BANK_VERIFICATION"
  return "PAYMENT_METHOD"
}

/**
 * The integration capabilities that come automatically for a provider,
 * given what its catalog entry declares. The admin picks business
 * capabilities; these are merged in by the backend so the resolved
 * `enabledCapabilities` still contains everything the gateway checks for
 * (BANK_LIST for vendor bank discovery, WEBHOOKS, BANK_ACCOUNT_RESOLUTION)
 * without ever being a checkbox.
 */
export function autoEnabledIntegrationCapabilities(providerCapabilities: string[]): ProviderCapability[] {
  const declared = new Set(providerCapabilities)
  return INTEGRATION_CAPABILITIES.filter((c) => declared.has(c))
}

/**
 * Resolve the full `enabledCapabilities` for a country provider account:
 * the admin-chosen business capabilities, plus every integration
 * capability the provider supports. Order-stable, de-duplicated.
 */
export function resolveEnabledCapabilities(
  adminSelected: string[],
  providerCapabilities: string[],
): ProviderCapability[] {
  const business = adminSelected.filter(isBusinessCapability)
  const integration = autoEnabledIntegrationCapabilities(providerCapabilities)
  return [...new Set<ProviderCapability>([...business, ...integration])]
}

export const PAYMENT_METHOD_TYPES = ["MOBILE_MONEY", "BANK", "DIGITAL_WALLET", "CARD"] as const
export type PaymentMethodTypeToken = (typeof PAYMENT_METHOD_TYPES)[number]

const CAPABILITY_SET: ReadonlySet<string> = new Set(PROVIDER_CAPABILITIES)
const METHOD_TYPE_SET: ReadonlySet<string> = new Set(PAYMENT_METHOD_TYPES)

export function isProviderCapability(value: string): value is ProviderCapability {
  return CAPABILITY_SET.has(value)
}

/**
 * Which capabilities can serve a given PaymentMethod.type. A provider that
 * declares `methodTypes: [CARD]` must declare at least one capability that
 * can actually act on a card, etc.
 */
const METHOD_TYPE_REQUIRES: Record<PaymentMethodTypeToken, ProviderCapability[]> = {
  CARD:           ["COLLECTION_CARD"],
  MOBILE_MONEY:   ["COLLECTION_MOBILE_MONEY", "PAYOUT_MOBILE_MONEY"],
  BANK:           ["COLLECTION_BANK_TRANSFER", "PAYOUT_BANK", "BANK_ACCOUNT_RESOLUTION"],
  DIGITAL_WALLET: ["COLLECTION_CARD"], // wallets settle over card rails in every provider we model today
}

export const COLLECTION_CAPABILITIES: ProviderCapability[] = [
  "COLLECTION_CARD",
  "COLLECTION_MOBILE_MONEY",
  "COLLECTION_BANK_TRANSFER",
]

export const PAYOUT_CAPABILITIES: ProviderCapability[] = ["PAYOUT_BANK", "PAYOUT_MOBILE_MONEY"]

/** The collection capability that can service a given PaymentMethod.type. */
export function collectionCapabilityForMethodType(type: string): ProviderCapability | null {
  switch (type) {
    case "CARD": return "COLLECTION_CARD"
    case "MOBILE_MONEY": return "COLLECTION_MOBILE_MONEY"
    case "BANK": return "COLLECTION_BANK_TRANSFER"
    case "DIGITAL_WALLET": return "COLLECTION_CARD" // wallets settle over card rails
    default: return null
  }
}

/** The payout capability that can service a given PaymentMethod.type. */
export function payoutCapabilityForMethodType(type: string): ProviderCapability | null {
  switch (type) {
    case "BANK": return "PAYOUT_BANK"
    case "MOBILE_MONEY": return "PAYOUT_MOBILE_MONEY"
    default: return null
  }
}

/**
 * The single provider capability a CountryPaymentMethod needs from its
 * provider account, given the method's type and direction. `null` means the
 * combination is not payable (e.g. an OUTBOUND card) — a method like that
 * cannot be wired to any provider account.
 */
export function requiredCapabilityForMethod(
  methodType: string,
  direction: "INBOUND" | "OUTBOUND",
): ProviderCapability | null {
  return direction === "INBOUND"
    ? collectionCapabilityForMethodType(methodType)
    : payoutCapabilityForMethodType(methodType)
}

/**
 * Pure rule for whether a CountryProviderAccount may back a given
 * CountryPaymentMethod. Returns a machine code for the problem, or null if
 * it's fine. (The same-country guarantee is DB-enforced by the composite FK
 * + a service-level 404 — this only covers capability/status.)
 */
export function methodProviderAccountProblem(input: {
  methodType: string
  direction: "INBOUND" | "OUTBOUND"
  account: { status: string; enabledCapabilities: string[] } | null
}): "ACCOUNT_DISABLED" | "METHOD_NOT_PAYABLE" | "CAPABILITY_NOT_ENABLED" | null {
  if (!input.account) return null // unlink is always allowed
  if (input.account.status === "DISABLED") return "ACCOUNT_DISABLED"

  const needed = requiredCapabilityForMethod(input.methodType, input.direction)
  if (!needed) return "METHOD_NOT_PAYABLE"
  if (!input.account.enabledCapabilities.includes(needed)) return "CAPABILITY_NOT_ENABLED"
  return null
}

/**
 * Vendor-facing rule: may a vendor be OFFERED this OUTBOUND payment method as
 * a payout option right now? Stricter than methodProviderAccountProblem
 * (which allows an unlinked method so an admin can clear a wiring): the
 * method must be bound to a provider account that EXISTS, is ACTIVE, whose
 * provider is ACTIVE, and that enables the payout capability the method type
 * needs. An unwired or unusable method is never offered.
 */
export function isOutboundMethodPayable(input: {
  methodType: string
  account: { status: string; enabledCapabilities: string[]; providerStatus: string } | null
}): boolean {
  const a = input.account
  if (!a || a.status !== "ACTIVE" || a.providerStatus !== "ACTIVE") return false
  return (
    methodProviderAccountProblem({
      methodType: input.methodType,
      direction: "OUTBOUND",
      account: { status: a.status, enabledCapabilities: a.enabledCapabilities },
    }) === null
  )
}

/**
 * Enabled capabilities on a country provider account must be a subset of
 * what the provider's catalog entry declares — a country cannot turn on a
 * capability the provider can't do. Returns the offending values (empty =
 * valid).
 */
export function enabledCapabilitiesNotSupported(
  enabled: string[],
  providerCapabilities: string[],
): string[] {
  const supported = new Set(providerCapabilities)
  return enabled.filter((c) => !supported.has(c))
}

const ISO_4217_ALPHA_RE = /^[A-Z]{3}$/

export interface ProviderCapabilityInput {
  capabilities: string[]
  methodTypes?: string[]
  supportedCurrencies?: string[]
}

/**
 * Returns a list of human-readable problems — empty means coherent.
 * Enforced invariants:
 *   - at least one capability
 *   - every capability is a known token, no duplicates
 *   - every methodType is a known token, no duplicates
 *   - every declared methodType is backed by at least one capability that
 *     can act on it (no "supports CARD" without a card capability)
 *   - every supportedCurrencies entry is a well-formed ISO-4217 alpha code
 */
export function validateProviderCapabilityCoherence(input: ProviderCapabilityInput): string[] {
  const problems: string[] = []
  const { capabilities, methodTypes = [], supportedCurrencies = [] } = input

  if (!Array.isArray(capabilities) || capabilities.length === 0) {
    problems.push("A provider must declare at least one capability")
  }

  const unknownCaps = capabilities.filter((c) => !CAPABILITY_SET.has(c))
  if (unknownCaps.length) problems.push(`Unknown capability value(s): ${unknownCaps.join(", ")}`)
  if (new Set(capabilities).size !== capabilities.length) problems.push("Duplicate capability values")

  const unknownTypes = methodTypes.filter((t) => !METHOD_TYPE_SET.has(t))
  if (unknownTypes.length) problems.push(`Unknown method type(s): ${unknownTypes.join(", ")}`)
  if (new Set(methodTypes).size !== methodTypes.length) problems.push("Duplicate method type values")

  const capSet = new Set(capabilities)
  for (const t of methodTypes) {
    if (!METHOD_TYPE_SET.has(t)) continue
    const accepted = METHOD_TYPE_REQUIRES[t as PaymentMethodTypeToken]
    if (!accepted.some((c) => capSet.has(c))) {
      problems.push(`Method type ${t} is declared but no supporting capability (${accepted.join(" / ")}) is declared`)
    }
  }

  const badCurrencies = supportedCurrencies.filter((c) => !ISO_4217_ALPHA_RE.test(c))
  if (badCurrencies.length) problems.push(`Malformed currency code(s): ${badCurrencies.join(", ")}`)
  if (new Set(supportedCurrencies).size !== supportedCurrencies.length) problems.push("Duplicate currency codes")

  return problems
}
