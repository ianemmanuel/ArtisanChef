import { prisma, CountryFinancialConfigStatus, CountryProviderAccountStatus } from "@repo/db"
import { ApiError } from "@/errors/ApiError"
import { logger } from "@/lib/pino/logger"
import { isEnvironmentActivatable, expectedProviderEnvironment } from "../lib/environment"
import { getProviderAdapter, hasProviderAdapter } from "../providers/provider.registry"
import { providerSecretsResolver, ProviderSecretsError } from "../secrets/provider-secrets.resolver"
import {
  isIntegrationCapability,
  providerRouteClassFor,
  type ProviderCapability,
} from "../providers/provider.capabilities"
import type { PaymentProviderAdapter, ProviderCallContext, ProviderEnvironment } from "../providers/provider.types"

/*
 * "Are the resolved credentials actually complete?" — a no-network check.
 * The generic resolver only knows "some env var for this alias exists";
 * the ADAPTER knows which keys its credential reader needs. A partial
 * bundle (only clientId, say) must not read as connectable.
 */
async function resolvedCredentialsComplete(
  alias: string,
  adapter: PaymentProviderAdapter | null,
): Promise<boolean> {
  const required = adapter?.requiredSecretKeys
  if (!required || required.length === 0) {
    return providerSecretsResolver.has(alias)
  }
  let bundle: Record<string, string>
  try {
    bundle = await providerSecretsResolver.resolve(alias)
  } catch {
    return false
  }
  const present = new Set(Object.keys(bundle).map((k) => k.toLowerCase()))
  return required.every((k) => {
    const lk = k.toLowerCase()
    return present.has(lk) && !!bundle[lk]?.trim()
  })
}

const serviceLog = logger.child({ module: "finance-provider-gateway" })

/*
 * finance.providerGateway.service — the ONE bridge from the finance domain
 * to a payment-provider adapter.
 *
 * Provider routing is CAPABILITY-SCOPED and EXPLICIT. There is no "the
 * country's active/primary provider account" and no fallback of any kind:
 *
 *   • Method-specific business capabilities (COLLECTION_*, PAYOUT_*, REFUND)
 *     route through a specific CountryPaymentMethod's
 *     `countryProviderAccountId`. The caller MUST supply
 *     `opts.countryPaymentMethodId` — without it the call fails with
 *     ROUTING_CONTEXT_REQUIRED, it is never guessed.
 *
 *   • The country-global bank-account verification / resolution capabilities
 *     (BANK_ACCOUNT_RESOLUTION, BANK_LIST) route through
 *     CountryFinancialConfig.bankVerificationProviderAccountId — an explicit,
 *     independent binding. Never inferred from a collection/payout provider.
 *
 *   • WEBHOOKS is not resolvable here (it is not a single-account concept —
 *     the inbound webhook handler matches a signature against every
 *     non-DISABLED account for the provider).
 *
 * A missing or unusable route always produces an explicit configuration
 * error (PROVIDER_ACCOUNT_NOT_CONFIGURED / PROVIDER_ACCOUNT_NOT_ACTIVE /
 * PROVIDER_CAPABILITY_NOT_ENABLED / …), never a silent switch to another
 * account. Cross-country routing is impossible: the method↔account and
 * config↔account links are both composite same-country FKs, and this
 * service asserts `account.countryId === countryId` on every path.
 */

export interface ResolveGatewayOptions {
  traceId?: string
  /**
   * Required for a method-specific business capability (COLLECTION_*,
   * PAYOUT_*, REFUND) — the CountryPaymentMethod whose wired provider
   * account should execute the call.
   */
  countryPaymentMethodId?: string
}

export interface ResolvedProviderGateway {
  adapter: PaymentProviderAdapter
  ctx: ProviderCallContext
  providerCode: string
  environment: ProviderEnvironment
  account: { id: string; countryId: string; secretAlias: string }
}

interface RoutedSetup {
  countryId: string
  providerCode: string
  environment: ProviderEnvironment
  /** How this account was selected — for logging / error context. */
  routeVia: "PAYMENT_METHOD" | "BANK_VERIFICATION_BINDING"
  account: {
    id: string
    countryId: string
    secretAlias: string
    enabledCapabilities: string[]
  }
}

function assertAccountUsable(
  countryId: string,
  account: {
    id: string
    countryId: string
    status: string
    environment: string
    paymentProvider: { code: string; status: string }
  },
): void {
  // Composite FKs already guarantee same-country, but a provider call must
  // never run against the wrong country's account — assert regardless.
  if (account.countryId !== countryId) {
    serviceLog.error(
      { countryId, accountId: account.id, accountCountry: account.countryId },
      "Provider account country mismatch",
    )
    throw new ApiError(500, "Provider account country mismatch", "PROVIDER_ACCOUNT_COUNTRY_MISMATCH")
  }
  if (account.status !== CountryProviderAccountStatus.ACTIVE) {
    throw new ApiError(409, "The routed provider account is not active", "PROVIDER_ACCOUNT_NOT_ACTIVE")
  }
  if (account.paymentProvider.status !== "ACTIVE") {
    throw new ApiError(409, "The payment provider is inactive", "PROVIDER_INACTIVE")
  }
  if (!isEnvironmentActivatable(account.environment)) {
    throw new ApiError(
      409,
      `This deployment can only run ${expectedProviderEnvironment()} provider accounts (this one is ${account.environment})`,
      "PROVIDER_ENVIRONMENT_MISMATCH",
    )
  }
}

async function routeViaPaymentMethod(
  countryId: string,
  countryPaymentMethodId: string,
): Promise<RoutedSetup> {
  const method = await prisma.countryPaymentMethod.findUnique({
    where: { id: countryPaymentMethodId },
    include: {
      countryProviderAccount: {
        include: { paymentProvider: { select: { code: true, status: true } } },
      },
    },
  })
  // Same-country only — a method id from another country is "not found", not
  // "wrong country" (it must not confirm the id exists elsewhere).
  if (!method || method.countryId !== countryId) {
    throw new ApiError(404, "Payment method not found for this country", "PAYMENT_METHOD_NOT_FOUND")
  }
  const account = method.countryProviderAccount
  if (!account) {
    throw new ApiError(
      409,
      "This payment method is not wired to a provider account",
      "PROVIDER_ACCOUNT_NOT_CONFIGURED",
    )
  }
  assertAccountUsable(countryId, account)
  return {
    countryId,
    providerCode: account.paymentProvider.code,
    environment: account.environment as ProviderEnvironment,
    routeVia: "PAYMENT_METHOD",
    account: {
      id: account.id,
      countryId: account.countryId,
      secretAlias: account.secretAlias,
      enabledCapabilities: account.enabledCapabilities,
    },
  }
}

async function routeViaBankVerificationBinding(countryId: string): Promise<RoutedSetup> {
  const config = await prisma.countryFinancialConfig.findUnique({
    where: { countryId },
    include: {
      bankVerificationProviderAccount: {
        include: { paymentProvider: { select: { code: true, status: true } } },
      },
    },
  })
  if (!config || config.status !== CountryFinancialConfigStatus.ACTIVE) {
    throw new ApiError(409, "This country's financial configuration is not active", "FINANCE_NOT_ACTIVE")
  }
  const account = config.bankVerificationProviderAccount
  if (!account) {
    throw new ApiError(
      409,
      "This country has no bank-account verification provider configured",
      "PROVIDER_ACCOUNT_NOT_CONFIGURED",
    )
  }
  assertAccountUsable(countryId, account)
  return {
    countryId,
    providerCode: account.paymentProvider.code,
    environment: account.environment as ProviderEnvironment,
    routeVia: "BANK_VERIFICATION_BINDING",
    account: {
      id: account.id,
      countryId: account.countryId,
      secretAlias: account.secretAlias,
      enabledCapabilities: account.enabledCapabilities,
    },
  }
}

async function resolveRoute(
  countryId: string,
  capability: ProviderCapability,
  opts: ResolveGatewayOptions,
): Promise<RoutedSetup> {
  switch (providerRouteClassFor(capability)) {
    case "UNROUTABLE":
      throw new ApiError(
        400,
        "WEBHOOKS is not resolvable through the gateway — the inbound webhook handler verifies against every non-disabled account",
        "ROUTING_CONTEXT_REQUIRED",
      )
    case "BANK_VERIFICATION":
      return routeViaBankVerificationBinding(countryId)
    case "PAYMENT_METHOD":
      if (!opts.countryPaymentMethodId) {
        throw new ApiError(
          400,
          `The "${capability}" capability is method-specific — a countryPaymentMethodId is required to route it`,
          "ROUTING_CONTEXT_REQUIRED",
        )
      }
      return routeViaPaymentMethod(countryId, opts.countryPaymentMethodId)
  }
}

/** Which adapter surface a capability lives on. */
function adapterSurfaceFor(capability: ProviderCapability): keyof PaymentProviderAdapter | null {
  switch (capability) {
    case "COLLECTION_CARD":
    case "COLLECTION_MOBILE_MONEY":
    case "COLLECTION_BANK_TRANSFER":
      return "collection"
    case "REFUND":
      return "refunds"
    case "PAYOUT_BANK":
    case "PAYOUT_MOBILE_MONEY":
      return "payouts"
    case "BANK_ACCOUNT_RESOLUTION":
      return "bankResolution"
    case "BANK_LIST":
      return "bankList"
    case "WEBHOOKS":
      return "webhooks"
    default:
      return null
  }
}

/**
 * Resolve the provider adapter + a bound call context for `capability` in
 * `countryId`, using explicit routing context. Throws an ApiError if any
 * routing / lifecycle / environment / capability / adapter / credentials
 * precondition fails — never falls back to another provider account.
 */
export async function resolveProviderGateway(
  countryId: string,
  capability: ProviderCapability,
  opts: ResolveGatewayOptions = {},
): Promise<ResolvedProviderGateway> {
  const setup = await resolveRoute(countryId, capability, opts)

  // Integration capabilities (BANK_ACCOUNT_RESOLUTION, BANK_LIST, WEBHOOKS)
  // are never an admin checkbox — they're auto-derived from what the
  // provider + adapter implement. The stored enabledCapabilities list is
  // authoritative only for BUSINESS capabilities.
  if (!isIntegrationCapability(capability) && !setup.account.enabledCapabilities.includes(capability)) {
    throw new ApiError(
      422,
      `The routed provider account does not enable the "${capability}" capability`,
      "PROVIDER_CAPABILITY_NOT_ENABLED",
    )
  }

  if (!hasProviderAdapter(setup.providerCode)) {
    throw new ApiError(
      501,
      `No adapter is registered for provider "${setup.providerCode}"`,
      "PROVIDER_ADAPTER_NOT_IMPLEMENTED",
    )
  }
  const adapter = getProviderAdapter(setup.providerCode)

  const surface = adapterSurfaceFor(capability)
  if (!surface || !adapter[surface] || !adapter.capabilities.has(capability)) {
    throw new ApiError(
      422,
      `Provider "${setup.providerCode}" does not implement the "${capability}" capability`,
      "PROVIDER_CAPABILITY_UNSUPPORTED",
    )
  }

  let secrets: Record<string, string>
  try {
    secrets = await providerSecretsResolver.resolve(setup.account.secretAlias)
  } catch (err) {
    if (err instanceof ProviderSecretsError) {
      serviceLog.error(
        { countryId, accountId: setup.account.id, routeVia: setup.routeVia },
        "Provider credentials could not be resolved",
      )
      throw new ApiError(502, "Payment provider credentials are not configured", "PROVIDER_CREDENTIALS_UNRESOLVED")
    }
    throw err
  }

  return {
    adapter,
    ctx: { environment: setup.environment, secrets, traceId: opts.traceId },
    providerCode: setup.providerCode,
    environment: setup.environment,
    account: setup.account,
  }
}

//* ─── Safe, no-network status for readiness + the admin UI ───────────────

export interface ProviderGatewayStatus {
  configured: boolean
  providerCode: string | null
  environment: ProviderEnvironment | null
  adapterRegistered: boolean
  credentialsResolvable: boolean
  enabledCapabilities: string[]
  /** Machine-readable blockers, if any. */
  blockers: string[]
}

/**
 * Report whether a country COULD reach its BANK-ACCOUNT-VERIFICATION
 * provider — without making a single provider call. This is the one
 * country-global provider route surfaced on the ERP financial-config view;
 * per-method (collection/payout) routing health lives in the readiness
 * check and the payment-method wiring list.
 */
export async function getProviderGatewayStatus(countryId: string): Promise<ProviderGatewayStatus> {
  const config = await prisma.countryFinancialConfig.findUnique({
    where: { countryId },
    include: {
      bankVerificationProviderAccount: {
        include: { paymentProvider: { select: { code: true, status: true } } },
      },
    },
  })

  const account = config?.bankVerificationProviderAccount
  if (!config || !account) {
    return {
      configured: false,
      providerCode: null,
      environment: null,
      adapterRegistered: false,
      credentialsResolvable: false,
      enabledCapabilities: [],
      blockers: config ? ["BANK_VERIFICATION_ACCOUNT_NOT_CONFIGURED"] : ["FINANCIAL_CONFIG_MISSING"],
    }
  }

  const providerCode = account.paymentProvider.code
  const adapterRegistered = hasProviderAdapter(providerCode)
  const credentialsResolvable = await resolvedCredentialsComplete(
    account.secretAlias,
    adapterRegistered ? getProviderAdapter(providerCode) : null,
  )

  const blockers: string[] = []
  if (config.status !== CountryFinancialConfigStatus.ACTIVE) blockers.push("FINANCIAL_CONFIG_NOT_ACTIVE")
  if (account.status !== CountryProviderAccountStatus.ACTIVE) blockers.push("PROVIDER_ACCOUNT_NOT_ACTIVE")
  if (account.paymentProvider.status !== "ACTIVE") blockers.push("PROVIDER_INACTIVE")
  if (!isEnvironmentActivatable(account.environment)) blockers.push("PROVIDER_ENVIRONMENT_MISMATCH")
  if (!adapterRegistered) blockers.push("PROVIDER_ADAPTER_UNAVAILABLE")
  if (!credentialsResolvable) blockers.push("PROVIDER_CREDENTIALS_UNRESOLVED")
  if (!account.enabledCapabilities.includes("BANK_ACCOUNT_RESOLUTION")) {
    blockers.push("BANK_ACCOUNT_RESOLUTION_NOT_ENABLED")
  }

  return {
    configured: true,
    providerCode,
    environment: account.environment as ProviderEnvironment,
    adapterRegistered,
    credentialsResolvable,
    enabledCapabilities: account.enabledCapabilities,
    blockers,
  }
}
