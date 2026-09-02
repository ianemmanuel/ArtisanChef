import { prisma, CountryFinancialConfigStatus, CountryProviderAccountStatus } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/errors/ApiError"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"
import { assertGlobalFinanceScope, assertCountryFinanceConfigScope } from "../lib/scope"
import { isEnvironmentActivatable, expectedProviderEnvironment } from "../lib/environment"
import { COLLECTION_CAPABILITIES, PAYOUT_CAPABILITIES } from "../providers/provider.capabilities"
import { getFinancialReadiness } from "./finance.readiness.service"
import { getProviderGatewayStatus } from "./finance.providerGateway.service"
import { listCountryPaymentMethods } from "./finance.paymentMethodProvider.service"
import type { SetOperationalSwitchesInput } from "../schemas/finance.countryConfig.schema"

const serviceLog = logger.child({ module: "finance-country-config-service" })

/*
 * CountryFinancialConfig — a country's financial operating configuration
 * (1:1, mutable, not versioned).
 *
 * Structural settings (currency, active provider account) vs operational
 * settings (collectionsEnabled/payoutsEnabled):
 *   - Operational switches: changeable while ACTIVE, validated + audited,
 *     own-country scope OK.
 *   - Structural: a controlled action. On an ACTIVE config → GLOBAL scope
 *     only. Never a generic PATCH — each has its own endpoint/action.
 *
 * Lifecycle (activate/suspend/disable): GLOBAL scope only, explicit
 * actions, activation runs full structural prerequisite validation.
 * Financial READINESS (both collection + payout) is a separate concept
 * checked at COUNTRY activation — see finance.readiness.service.ts.
 */

const CONFIG_INCLUDE = {
  currency: true,
  activeProviderAccount: {
    include: { paymentProvider: { select: { id: true, code: true, name: true, status: true, capabilities: true } } },
  },
} as const

async function loadConfig(countryId: string) {
  return prisma.countryFinancialConfig.findUnique({ where: { countryId }, include: CONFIG_INCLUDE })
}

async function assertCountryExists(countryId: string) {
  const country = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } })
  if (!country) throw new ApiError(404, "Country not found", "NOT_FOUND")
}

function isStructuralScopeAllowed(status: string, scope: AdminScopeContext, countryId: string) {
  // DRAFT: own-country admin may edit structural fields. ACTIVE/SUSPENDED:
  // structural changes are GLOBAL only.
  if (status === CountryFinancialConfigStatus.DRAFT) {
    assertCountryFinanceConfigScope(scope, countryId)
  } else {
    assertGlobalFinanceScope(scope)
  }
}

//* Read / get-or-create

export async function getOrCreateConfig(countryId: string, actorId: string, scope: AdminScopeContext) {
  assertCountryFinanceConfigScope(scope, countryId)
  await assertCountryExists(countryId)

  const existing = await loadConfig(countryId)
  if (existing) return existing

  await prisma.countryFinancialConfig.create({
    data: { countryId, status: CountryFinancialConfigStatus.DRAFT, createdByAdminId: actorId },
  })
  serviceLog.info({ countryId, actorId }, "Financial config created (DRAFT)")
  auditService.log({
    adminUserId: actorId,
    action: "country_financial_config.created",
    entityType: "CountryFinancialConfig",
    entityId: countryId,
    changes: { after: { status: "DRAFT" } },
    metadata: { countryId },
  })
  return loadConfig(countryId)
}

/** Read-only — never creates. */
export async function getConfig(countryId: string, scope: AdminScopeContext) {
  assertCountryFinanceConfigScope(scope, countryId)
  return loadConfig(countryId)
}

//* Structural configuration 

export async function setConfigCurrency(countryId: string, currencyCode: string, actorId: string, scope: AdminScopeContext) {
  const config = await loadConfig(countryId)
  if (!config) throw new ApiError(404, "Financial config not found — create it first", "CONFIG_NOT_FOUND")
  if (config.status === CountryFinancialConfigStatus.DISABLED) {
    throw new ApiError(400, "A disabled financial config cannot be changed", "CONFIG_DISABLED")
  }
  isStructuralScopeAllowed(config.status, scope, countryId)

  const currency = await prisma.currency.findUnique({ where: { code: currencyCode } })
  if (!currency) throw new ApiError(404, `Currency "${currencyCode}" is not in the reference table`, "CURRENCY_NOT_FOUND")
  if (currency.status !== "ACTIVE") throw new ApiError(400, `Currency "${currencyCode}" is inactive`, "CURRENCY_INACTIVE")
  if (config.currencyCode === currencyCode) throw new ApiError(400, "Currency is already set to this value", "NO_CHANGE")

  const updated = await prisma.countryFinancialConfig.update({
    where: { countryId },
    data: { currencyCode },
    include: CONFIG_INCLUDE,
  })

  serviceLog.info({ countryId, currencyCode, actorId, wasActive: config.status === "ACTIVE" }, "Financial config currency changed")
  auditService.log({
    adminUserId: actorId,
    action: "country_financial_config.currency_changed",
    entityType: "CountryFinancialConfig",
    entityId: countryId,
    changes: { before: { currencyCode: config.currencyCode }, after: { currencyCode } },
    metadata: { countryId, structural: true, configStatus: config.status },
  })
  return updated
}

export async function setActiveProviderAccount(
  countryId: string,
  accountId: string | null,
  actorId: string,
  scope: AdminScopeContext,
) {
  const config = await loadConfig(countryId)
  if (!config) throw new ApiError(404, "Financial config not found — create it first", "CONFIG_NOT_FOUND")
  if (config.status === CountryFinancialConfigStatus.DISABLED) {
    throw new ApiError(400, "A disabled financial config cannot be changed", "CONFIG_DISABLED")
  }
  isStructuralScopeAllowed(config.status, scope, countryId)

  if (accountId) {
    const account = await prisma.countryProviderAccount.findUnique({ where: { id: accountId } })
    // A provider account that doesn't exist AND one that belongs to another
    // country must be indistinguishable here — the caller supplied this id
    // and is only authorised for `countryId`, so anything else is "not
    // found", never "wrong country" (which would leak that the id is a real
    // provider account somewhere else).
    if (!account || account.countryId !== countryId) {
      throw new ApiError(404, "Provider account not found", "NOT_FOUND")
    }
    if (account.status === CountryProviderAccountStatus.DISABLED) {
      throw new ApiError(400, "A disabled provider account cannot be set as active", "ACCOUNT_DISABLED")
    }
    // An ACTIVE config must always point at an ACTIVE account.
    if (config.status === CountryFinancialConfigStatus.ACTIVE && account.status !== CountryProviderAccountStatus.ACTIVE) {
      throw new ApiError(422, "An active financial config can only point at an active provider account", "ACCOUNT_NOT_ACTIVE")
    }
  } else if (config.status === CountryFinancialConfigStatus.ACTIVE) {
    throw new ApiError(422, "An active financial config must keep a provider account — suspend the config to clear it", "CONFIG_ACTIVE")
  }

  const updated = await prisma.countryFinancialConfig.update({
    where: { countryId },
    data: { activeProviderAccountId: accountId },
    include: CONFIG_INCLUDE,
  })

  serviceLog.info({ countryId, accountId, actorId }, "Financial config active provider account changed")
  auditService.log({
    adminUserId: actorId,
    action: "country_financial_config.provider_account_changed",
    entityType: "CountryFinancialConfig",
    entityId: countryId,
    changes: { before: { activeProviderAccountId: config.activeProviderAccountId }, after: { activeProviderAccountId: accountId } },
    metadata: { countryId, structural: true, configStatus: config.status },
  })
  return updated
}

//* ─── Operational switches ──────────────────────────────────────────────

export async function setOperationalSwitches(
  countryId: string,
  input: SetOperationalSwitchesInput,
  actorId: string,
  scope: AdminScopeContext,
) {
  assertCountryFinanceConfigScope(scope, countryId)
  const config = await loadConfig(countryId)
  if (!config) throw new ApiError(404, "Financial config not found — create it first", "CONFIG_NOT_FOUND")
  if (config.status === CountryFinancialConfigStatus.DISABLED) {
    throw new ApiError(400, "A disabled financial config cannot be changed", "CONFIG_DISABLED")
  }

  const enabledCaps = new Set(config.activeProviderAccount?.enabledCapabilities ?? [])

  if (input.collectionsEnabled === true) {
    if (!config.activeProviderAccount) {
      throw new ApiError(422, "Set an active provider account before enabling collections", "NO_PROVIDER_ACCOUNT")
    }
    if (!COLLECTION_CAPABILITIES.some((c) => enabledCaps.has(c))) {
      throw new ApiError(422, "The active provider account enables no collection capability", "NO_COLLECTION_CAPABILITY")
    }
  }
  if (input.payoutsEnabled === true) {
    if (!config.activeProviderAccount) {
      throw new ApiError(422, "Set an active provider account before enabling payouts", "NO_PROVIDER_ACCOUNT")
    }
    if (!PAYOUT_CAPABILITIES.some((c) => enabledCaps.has(c))) {
      throw new ApiError(422, "The active provider account enables no payout capability", "NO_PAYOUT_CAPABILITY")
    }
  }

  const before = { collectionsEnabled: config.collectionsEnabled, payoutsEnabled: config.payoutsEnabled }
  const updated = await prisma.countryFinancialConfig.update({
    where: { countryId },
    data: {
      ...(input.collectionsEnabled !== undefined ? { collectionsEnabled: input.collectionsEnabled } : {}),
      ...(input.payoutsEnabled !== undefined ? { payoutsEnabled: input.payoutsEnabled } : {}),
    },
    include: CONFIG_INCLUDE,
  })

  serviceLog.info({ countryId, actorId, input }, "Financial config operational switches changed")
  auditService.log({
    adminUserId: actorId,
    action: "country_financial_config.switches_changed",
    entityType: "CountryFinancialConfig",
    entityId: countryId,
    changes: { before, after: { collectionsEnabled: updated.collectionsEnabled, payoutsEnabled: updated.payoutsEnabled } },
    metadata: { countryId },
  })
  return updated
}

//* ─── Lifecycle (GLOBAL scope only) ─────────────────────────────────────

/** Structural prerequisites for a config to go ACTIVE — NOT full financial readiness. */
async function assertConfigStructurallyActivatable(config: NonNullable<Awaited<ReturnType<typeof loadConfig>>>) {
  if (!config.currencyCode || !config.currency) {
    throw new ApiError(422, "Set a currency before activating this configuration", "CURRENCY_NOT_CONFIGURED")
  }
  if (config.currency.status !== "ACTIVE") {
    throw new ApiError(422, "The configured currency is inactive", "CURRENCY_INACTIVE")
  }
  const account = config.activeProviderAccount
  if (!account) {
    throw new ApiError(422, "Set an active provider account before activating this configuration", "PROVIDER_ACCOUNT_NOT_CONFIGURED")
  }
  if (account.status !== CountryProviderAccountStatus.ACTIVE) {
    throw new ApiError(422, "The provider account must be activated first", "PROVIDER_ACCOUNT_NOT_ACTIVE")
  }
  if (account.paymentProvider.status !== "ACTIVE") {
    throw new ApiError(422, "The payment provider is inactive", "PROVIDER_INACTIVE")
  }
  if (!isEnvironmentActivatable(account.environment)) {
    throw new ApiError(
      422,
      `This deployment can only run ${expectedProviderEnvironment()} provider accounts (this one is ${account.environment})`,
      "PROVIDER_ENVIRONMENT_MISMATCH",
    )
  }
}

export async function activateConfig(countryId: string, actorId: string, scope: AdminScopeContext) {
  assertGlobalFinanceScope(scope)
  const config = await loadConfig(countryId)
  if (!config) throw new ApiError(404, "Financial config not found", "CONFIG_NOT_FOUND")
  if (config.status === CountryFinancialConfigStatus.ACTIVE) {
    throw new ApiError(400, "Financial config is already active", "ALREADY_ACTIVE")
  }
  if (config.status === CountryFinancialConfigStatus.DISABLED) {
    throw new ApiError(400, "A disabled financial config cannot be reactivated", "CONFIG_DISABLED")
  }
  await assertConfigStructurallyActivatable(config)

  const updated = await prisma.countryFinancialConfig.update({
    where: { countryId },
    data: {
      status: CountryFinancialConfigStatus.ACTIVE,
      activatedAt: new Date(),
      activatedByAdminId: actorId,
      suspendedAt: null,
      suspendedByAdminId: null,
      suspensionReason: null,
    },
    include: CONFIG_INCLUDE,
  })

  serviceLog.info({ countryId, actorId }, "Financial config activated")
  auditService.log({
    adminUserId: actorId,
    action: "country_financial_config.activated",
    entityType: "CountryFinancialConfig",
    entityId: countryId,
    changes: { before: { status: config.status }, after: { status: "ACTIVE" } },
    metadata: { countryId },
  })
  return updated
}

export async function suspendConfig(countryId: string, reason: string, actorId: string, scope: AdminScopeContext) {
  assertGlobalFinanceScope(scope)
  if (!reason?.trim()) throw new ApiError(400, "A reason is required", "MISSING_FIELDS")
  const config = await loadConfig(countryId)
  if (!config) throw new ApiError(404, "Financial config not found", "CONFIG_NOT_FOUND")
  if (config.status !== CountryFinancialConfigStatus.ACTIVE) {
    throw new ApiError(400, "Only an active financial config can be suspended", "NOT_ACTIVE")
  }

  const updated = await prisma.countryFinancialConfig.update({
    where: { countryId },
    data: {
      status: CountryFinancialConfigStatus.SUSPENDED,
      suspendedAt: new Date(),
      suspendedByAdminId: actorId,
      suspensionReason: reason.trim(),
    },
    include: CONFIG_INCLUDE,
  })

  serviceLog.warn({ countryId, actorId }, "Financial config suspended")
  auditService.log({
    adminUserId: actorId,
    action: "country_financial_config.suspended",
    entityType: "CountryFinancialConfig",
    entityId: countryId,
    changes: { before: { status: "ACTIVE" }, after: { status: "SUSPENDED" } },
    metadata: { countryId, reason: reason.trim() },
  })
  return updated
}

export async function disableConfig(countryId: string, actorId: string, scope: AdminScopeContext) {
  assertGlobalFinanceScope(scope)
  const config = await loadConfig(countryId)
  if (!config) throw new ApiError(404, "Financial config not found", "CONFIG_NOT_FOUND")
  if (config.status === CountryFinancialConfigStatus.DISABLED) {
    throw new ApiError(400, "Financial config is already disabled", "ALREADY_DISABLED")
  }

  const updated = await prisma.countryFinancialConfig.update({
    where: { countryId },
    data: { status: CountryFinancialConfigStatus.DISABLED, disabledAt: new Date(), disabledByAdminId: actorId },
    include: CONFIG_INCLUDE,
  })

  serviceLog.warn({ countryId, actorId }, "Financial config disabled")
  auditService.log({
    adminUserId: actorId,
    action: "country_financial_config.disabled",
    entityType: "CountryFinancialConfig",
    entityId: countryId,
    changes: { before: { status: config.status }, after: { status: "DISABLED" } },
    metadata: { countryId },
  })
  return updated
}

//* Combined view for the Admin ERP 

export async function getCountryFinancialConfigView(countryId: string, scope: AdminScopeContext) {
  assertCountryFinanceConfigScope(scope, countryId)
  await assertCountryExists(countryId)

  const [config, providerAccounts, readiness, providerGateway, paymentMethods] = await Promise.all([
    loadConfig(countryId),
    prisma.countryProviderAccount.findMany({
      where: { countryId },
      include: { paymentProvider: { select: { id: true, code: true, name: true, status: true, capabilities: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    getFinancialReadiness(countryId),
    getProviderGatewayStatus(countryId),
    listCountryPaymentMethods(countryId, scope),
  ])

  return {
    config,
    providerAccounts: providerAccounts.map((a) => ({ ...a, secretAlias: "***" })),
    readiness,
    providerGateway,
    // listCountryPaymentMethods selects no secret material on the linked
    // account (id/status/environment/label/capabilities/provider only).
    paymentMethods,
    canManageDraft: scope.isGlobal || scope.countryIds.includes(countryId),
    canManageLifecycle: scope.isGlobal,
  }
}
