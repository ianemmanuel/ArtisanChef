import { prisma, CountryFinancialConfigStatus, CountryProviderAccountStatus } from "@repo/db"
import { ApiError } from "@/errors/ApiError"
import { logger } from "@/lib/pino/logger"
import { isEnvironmentActivatable, expectedProviderEnvironment } from "../lib/environment"
import { getProviderAdapter, hasProviderAdapter } from "../providers/provider.registry"
import { providerSecretsResolver, ProviderSecretsError } from "../secrets/provider-secrets.resolver"
import type { ProviderCapability } from "../providers/provider.capabilities"
import type { PaymentProviderAdapter, ProviderCallContext, ProviderEnvironment } from "../providers/provider.types"

const serviceLog = logger.child({ module: "finance-provider-gateway" })

/*
 * finance.providerGateway.service — the ONE bridge from the finance domain
 * to a payment-provider adapter.
 *
 * A caller (a future payment/payout flow) asks for a CAPABILITY for a
 * country. This service:
 *   1. loads the country's ACTIVE financial config + ACTIVE provider account
 *   2. re-checks every Phase 1B lifecycle/environment rule (never bypassed)
 *   3. confirms the enabled capabilities include the one asked for
 *   4. resolves the account's secret bundle (alias -> ProviderSecretsResolver)
 *   5. gets the adapter from the registry by provider code and confirms it
 *      implements that capability
 *   6. returns the adapter + a ProviderCallContext bound to this account
 *
 * The finance domain never sees a provider code branch — the registry is
 * the only code->adapter resolution. Business authorization (country scope,
 * lifecycle) stays here; provider-specific communication stays in the adapter.
 *
 * Phase 1C: nothing in a request flow calls resolveProviderGateway yet
 * (there is no checkout / payout run). It exists, fully validated and
 * tested, so the next phase's payment flow plugs straight in.
 */

export interface ResolvedProviderGateway {
  adapter: PaymentProviderAdapter
  ctx: ProviderCallContext
  providerCode: string
  environment: ProviderEnvironment
  account: { id: string; countryId: string; secretAlias: string }
}

interface ActiveSetup {
  countryId: string
  providerCode: string
  environment: ProviderEnvironment
  account: {
    id: string
    countryId: string
    secretAlias: string
    enabledCapabilities: string[]
  }
}

async function loadActiveSetup(countryId: string): Promise<ActiveSetup> {
  const config = await prisma.countryFinancialConfig.findUnique({
    where: { countryId },
    include: {
      activeProviderAccount: {
        include: { paymentProvider: { select: { code: true, status: true } } },
      },
    },
  })

  if (!config || config.status !== CountryFinancialConfigStatus.ACTIVE) {
    throw new ApiError(409, "This country's financial configuration is not active", "FINANCE_NOT_ACTIVE")
  }
  const account = config.activeProviderAccount
  if (!account) {
    throw new ApiError(409, "This country has no active provider account", "PROVIDER_ACCOUNT_NOT_CONFIGURED")
  }
  // The composite FK makes a cross-country link impossible, but assert anyway
  // — a provider call must never run against the wrong country's account.
  if (account.countryId !== countryId) {
    serviceLog.error({ countryId, accountId: account.id, accountCountry: account.countryId }, "Provider account country mismatch")
    throw new ApiError(500, "Provider account country mismatch", "PROVIDER_ACCOUNT_COUNTRY_MISMATCH")
  }
  if (account.status !== CountryProviderAccountStatus.ACTIVE) {
    throw new ApiError(409, "The country's provider account is not active", "PROVIDER_ACCOUNT_NOT_ACTIVE")
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

  return {
    countryId,
    providerCode: account.paymentProvider.code,
    environment: account.environment as ProviderEnvironment,
    account: {
      id: account.id,
      countryId: account.countryId,
      secretAlias: account.secretAlias,
      enabledCapabilities: account.enabledCapabilities,
    },
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
    case "WEBHOOKS":
      return "webhooks"
    default:
      return null
  }
}

/**
 * Resolve the provider adapter + a bound call context for `capability` in
 * `countryId`. Throws an ApiError if any lifecycle / environment / capability
 * / adapter / credentials precondition fails.
 */
export async function resolveProviderGateway(
  countryId: string,
  capability: ProviderCapability,
  opts: { traceId?: string } = {},
): Promise<ResolvedProviderGateway> {
  const setup = await loadActiveSetup(countryId)

  if (!setup.account.enabledCapabilities.includes(capability)) {
    throw new ApiError(
      422,
      `The provider account for this country does not enable the "${capability}" capability`,
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
      serviceLog.error({ countryId, accountId: setup.account.id }, "Provider credentials could not be resolved")
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
 * Report whether a country COULD talk to its provider — without making a
 * single provider call. Used by readiness + the Finance → Countries page.
 */
export async function getProviderGatewayStatus(countryId: string): Promise<ProviderGatewayStatus> {
  const config = await prisma.countryFinancialConfig.findUnique({
    where: { countryId },
    include: {
      activeProviderAccount: {
        include: { paymentProvider: { select: { code: true, status: true } } },
      },
    },
  })

  const account = config?.activeProviderAccount
  if (!config || !account) {
    return {
      configured: false,
      providerCode: null,
      environment: null,
      adapterRegistered: false,
      credentialsResolvable: false,
      enabledCapabilities: [],
      blockers: config ? ["PROVIDER_ACCOUNT_NOT_CONFIGURED"] : ["FINANCIAL_CONFIG_MISSING"],
    }
  }

  const providerCode = account.paymentProvider.code
  const adapterRegistered = hasProviderAdapter(providerCode)
  const credentialsResolvable = await providerSecretsResolver.has(account.secretAlias)

  const blockers: string[] = []
  if (config.status !== CountryFinancialConfigStatus.ACTIVE) blockers.push("FINANCIAL_CONFIG_NOT_ACTIVE")
  if (account.status !== CountryProviderAccountStatus.ACTIVE) blockers.push("PROVIDER_ACCOUNT_NOT_ACTIVE")
  if (account.paymentProvider.status !== "ACTIVE") blockers.push("PROVIDER_INACTIVE")
  if (!isEnvironmentActivatable(account.environment)) blockers.push("PROVIDER_ENVIRONMENT_MISMATCH")
  if (!adapterRegistered) blockers.push("PROVIDER_ADAPTER_UNAVAILABLE")
  if (!credentialsResolvable) blockers.push("PROVIDER_CREDENTIALS_UNRESOLVED")

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
