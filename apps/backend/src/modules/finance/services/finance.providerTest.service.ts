import { prisma, CountryProviderAccountStatus } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/errors/ApiError"
import { logger } from "@/lib/pino/logger"
import { assertGlobalFinanceScope, assertFinanceRecordVisibleOr404 } from "../lib/scope"
import { isEnvironmentActivatable, expectedProviderEnvironment } from "../lib/environment"
import { getProviderAdapter, hasProviderAdapter } from "../providers/provider.registry"
import { providerSecretsResolver, ProviderSecretsError } from "../secrets/provider-secrets.resolver"
import { isProviderError } from "../providers/provider.errors"
import type { ProviderCallContext, NormalizedBank } from "../providers/provider.types"

const serviceLog = logger.child({ module: "finance-provider-test" })

/*
 * Pre-activation provider connectivity test. Lets an admin confirm the
 * selected provider account actually works — resolves credentials, calls
 * the provider's own bank-directory capability through the registered
 * adapter, and returns the normalized bank list — BEFORE the country's
 * financial configuration is activated.
 *
 * Unlike resolveProviderGateway (which requires an ACTIVE config + ACTIVE
 * account and is the runtime routing path), this targets one specific
 * account by id and only needs the account itself to be usable. It never
 * mutates anything. The environment guard still applies: a non-production
 * deployment can only test TEST accounts, production only LIVE.
 */

export interface ProviderBankListTestResult {
  provider: string
  environment: "TEST" | "LIVE"
  countryCode: string
  banks: NormalizedBank[]
  count: number
}

export async function testProviderAccountBankList(
  accountId: string,
  scope: AdminScopeContext,
  opts: { traceId?: string } = {},
): Promise<ProviderBankListTestResult> {
  assertGlobalFinanceScope(scope)

  const account = await prisma.countryProviderAccount.findUnique({
    where: { id: accountId },
    include: {
      paymentProvider: { select: { code: true, name: true, status: true } },
      country: { select: { code: true } },
    },
  })
  if (!account) throw new ApiError(404, "Provider account not found", "NOT_FOUND")
  assertFinanceRecordVisibleOr404(account.countryId, scope, "Provider account")

  if (account.status === CountryProviderAccountStatus.DISABLED) {
    throw new ApiError(400, "A disabled provider account cannot be tested", "ACCOUNT_DISABLED")
  }
  if (account.paymentProvider.status !== "ACTIVE") {
    throw new ApiError(422, "The payment provider is inactive", "PROVIDER_INACTIVE")
  }
  if (!isEnvironmentActivatable(account.environment)) {
    throw new ApiError(
      422,
      `This deployment can only test ${expectedProviderEnvironment()} provider accounts (this one is ${account.environment})`,
      "PROVIDER_ENVIRONMENT_MISMATCH",
    )
  }

  const providerCode = account.paymentProvider.code
  if (!hasProviderAdapter(providerCode)) {
    throw new ApiError(501, `No adapter is registered for provider "${providerCode}"`, "PROVIDER_ADAPTER_NOT_IMPLEMENTED")
  }
  const adapter = getProviderAdapter(providerCode)
  if (!adapter.bankList || !adapter.capabilities.has("BANK_LIST")) {
    throw new ApiError(422, `Provider "${providerCode}" does not provide a bank directory`, "PROVIDER_CAPABILITY_UNSUPPORTED")
  }

  let secrets: Record<string, string>
  try {
    secrets = await providerSecretsResolver.resolve(account.secretAlias)
  } catch (err) {
    if (err instanceof ProviderSecretsError) {
      serviceLog.warn({ accountId, countryId: account.countryId }, "Provider credentials not resolvable for test")
      throw new ApiError(502, "Payment provider credentials are not configured for this account", "PROVIDER_CREDENTIALS_UNRESOLVED")
    }
    throw err
  }

  const ctx: ProviderCallContext = { environment: account.environment as "TEST" | "LIVE", secrets, traceId: opts.traceId }
  try {
    const banks = await adapter.bankList.listBanks(ctx, { countryCode: account.country.code })
    serviceLog.info({ accountId, provider: providerCode, count: banks.length }, "Provider bank-list test succeeded")
    return {
      provider: account.paymentProvider.name,
      environment: account.environment as "TEST" | "LIVE",
      countryCode: account.country.code,
      banks,
      count: banks.length,
    }
  } catch (err) {
    if (isProviderError(err)) throw err.toApiError()
    throw err
  }
}
