import { prisma, CountryFinancialConfigStatus, CountryProviderAccountStatus } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/errors/ApiError"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"
import { assertGlobalFinanceScope, assertCountryFinanceConfigScope } from "../lib/scope"
import { isEnvironmentActivatable, expectedProviderEnvironment } from "../lib/environment"
import { COLLECTION_CAPABILITIES, PAYOUT_CAPABILITIES } from "../providers/provider.capabilities"
import { resolveProviderCurrency } from "../providers/provider.currency"
import { getFinancialReadiness } from "./finance.readiness.service"
import { getProviderGatewayStatus } from "./finance.providerGateway.service"
import { listCountryPaymentMethods } from "./finance.paymentMethodProvider.service"
import type { SetOperationalSwitchesInput } from "../schemas/finance.countryConfig.schema"

const serviceLog = logger.child({ module: "finance-country-config-service" })

/*
 * CountryFinancialConfig — a country's financial operating configuration
 * (1:1, mutable, not versioned).
 *
 * Provider routing is capability-scoped and lives elsewhere: collection /
 * payout route per payment method (CountryPaymentMethod.countryProviderAccountId),
 * and this config carries ONE explicit country-global routing binding —
 * bankVerificationProviderAccountId, for the BANK_ACCOUNT_RESOLUTION /
 * BANK_LIST capability. There is no "the country's active provider account".
 *
 * Structural settings (the bank-verification binding) vs operational
 * settings (collectionsEnabled/payoutsEnabled):
 *   - Operational switches: changeable while ACTIVE, validated + audited,
 *     own-country scope OK.
 *   - Structural: a controlled action. On an ACTIVE config → GLOBAL scope
 *     only. Never a generic PATCH — each has its own endpoint/action.
 *
 * Lifecycle (activate/suspend/disable): GLOBAL scope only, explicit
 * actions, activation runs structural prerequisite validation (currency +
 * at least one usable provider account). Full financial READINESS (a wired,
 * usable provider account per capability) is a separate concept checked at
 * COUNTRY activation — see finance.readiness.service.ts.
 */

const CONFIG_INCLUDE = {
  currency: true,
  bankVerificationProviderAccount: {
    include: {
      paymentProvider: {
        select: { id: true, code: true, name: true, status: true, capabilities: true, supportedCurrencies: true },
      },
    },
  },
} as const

async function loadConfig(countryId: string) {
  return prisma.countryFinancialConfig.findUnique({ where: { countryId }, include: CONFIG_INCLUDE })
}

async function loadCountryOr404(countryId: string) {
  const country = await prisma.country.findUnique({
    where: { id: countryId },
    // currencyCode — the FK into the Currency reference table — is the ONE
    // source of truth for a country's currency. The financial config
    // mirrors it; the admin never picks a currency here.
    select: { id: true, currency: true, currencyCode: true },
  })
  if (!country) throw new ApiError(404, "Country not found", "NOT_FOUND")
  return country
}

/**
 * The country owns its currency (Country.currencyCode). Keep the financial
 * config's currencyCode in step with it — on a DRAFT config, or whenever it
 * hasn't been set yet. An ACTIVE config is never silently restructured;
 * divergence there (near-impossible — Country.currencyCode is stable) is
 * left for readiness to surface.
 */
async function syncConfigCurrencyFromCountry(
  countryId: string,
  config: NonNullable<Awaited<ReturnType<typeof loadConfig>>>,
  countryCurrencyCode: string | null,
) {
  const shouldSync =
    countryCurrencyCode != null &&
    config.currencyCode !== countryCurrencyCode &&
    (config.currencyCode == null || config.status === CountryFinancialConfigStatus.DRAFT)
  if (!shouldSync) return config
  return prisma.countryFinancialConfig.update({
    where: { countryId },
    data: { currencyCode: countryCurrencyCode },
    include: CONFIG_INCLUDE,
  })
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
  const country = await loadCountryOr404(countryId)

  const existing = await loadConfig(countryId)
  if (existing) return syncConfigCurrencyFromCountry(countryId, existing, country.currencyCode)

  await prisma.countryFinancialConfig.create({
    data: {
      countryId,
      status: CountryFinancialConfigStatus.DRAFT,
      // Mirror the country's currency (its FK into the Currency table).
      currencyCode: country.currencyCode ?? undefined,
      createdByAdminId: actorId,
    },
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
//
// Currency is NOT set here — it's owned by the country (Country.currencyCode)
// and mirrored onto the config by syncConfigCurrencyFromCountry. There is no
// admin-facing "set financial-config currency" action.
//
// The ONE structural routing binding on the config is the bank-account
// verification / resolution provider account. Collection/payout routing is
// per payment method and lives in finance.paymentMethodProvider.service.ts.

export async function setBankVerificationProviderAccount(
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
    // country must be indistinguishable here — anything but an in-country
    // account is "not found", never "wrong country".
    if (!account || account.countryId !== countryId) {
      throw new ApiError(404, "Provider account not found", "NOT_FOUND")
    }
    if (account.status === CountryProviderAccountStatus.DISABLED) {
      throw new ApiError(400, "A disabled provider account cannot be used for bank verification", "ACCOUNT_DISABLED")
    }
    if (!account.enabledCapabilities.includes("BANK_ACCOUNT_RESOLUTION")) {
      throw new ApiError(
        422,
        "That provider account does not enable bank-account resolution",
        "CAPABILITY_NOT_ENABLED",
      )
    }
    // An ACTIVE config's binding must point at an ACTIVE account.
    if (config.status === CountryFinancialConfigStatus.ACTIVE && account.status !== CountryProviderAccountStatus.ACTIVE) {
      throw new ApiError(422, "An active financial config can only bind an active provider account", "ACCOUNT_NOT_ACTIVE")
    }
  }
  // Clearing to null is always allowed — bank verification is an optional
  // capability. Cleared => vendor payout accounts fall back to the offline
  // structural-check + manual-review path (unchanged behaviour).

  const updated = await prisma.countryFinancialConfig.update({
    where: { countryId },
    data: { bankVerificationProviderAccountId: accountId },
    include: CONFIG_INCLUDE,
  })

  serviceLog.info({ countryId, accountId, actorId }, "Financial config bank-verification provider account changed")
  auditService.log({
    adminUserId: actorId,
    action: "country_financial_config.bank_verification_account_changed",
    entityType: "CountryFinancialConfig",
    entityId: countryId,
    changes: {
      before: { bankVerificationProviderAccountId: config.bankVerificationProviderAccountId },
      after: { bankVerificationProviderAccountId: accountId },
    },
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

  // A switch may be turned on only if the country has at least one ACTIVE
  // provider account that enables a capability of the matching kind. This is
  // a light gate — the real "is a usable account actually WIRED to an active
  // payment method" check is financial readiness, enforced at country
  // activation. (No "the active account" — routing is per-method.)
  if (input.collectionsEnabled === true || input.payoutsEnabled === true) {
    const activeAccounts = await prisma.countryProviderAccount.findMany({
      where: { countryId, status: CountryProviderAccountStatus.ACTIVE },
      select: { enabledCapabilities: true },
    })
    const allCaps = new Set(activeAccounts.flatMap((a) => a.enabledCapabilities))
    if (input.collectionsEnabled === true && !COLLECTION_CAPABILITIES.some((c) => allCaps.has(c))) {
      throw new ApiError(
        422,
        "No active provider account for this country enables a collection capability",
        "NO_COLLECTION_CAPABILITY",
      )
    }
    if (input.payoutsEnabled === true && !PAYOUT_CAPABILITIES.some((c) => allCaps.has(c))) {
      throw new ApiError(
        422,
        "No active provider account for this country enables a payout capability",
        "NO_PAYOUT_CAPABILITY",
      )
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

/**
 * Structural prerequisites for a config to go ACTIVE — NOT full financial
 * readiness (which additionally requires a usable provider account WIRED to
 * an active payment method per capability, checked at country activation).
 * Here: a currency, and at least one activatable ACTIVE provider account so
 * the config isn't structurally empty of any provider capability.
 */
async function assertConfigStructurallyActivatable(config: NonNullable<Awaited<ReturnType<typeof loadConfig>>>) {
  if (!config.currencyCode || !config.currency) {
    throw new ApiError(422, "Set a currency before activating this configuration", "CURRENCY_NOT_CONFIGURED")
  }
  if (config.currency.status !== "ACTIVE") {
    throw new ApiError(422, "The configured currency is inactive", "CURRENCY_INACTIVE")
  }
  const activeAccounts = await prisma.countryProviderAccount.findMany({
    where: { countryId: config.countryId, status: CountryProviderAccountStatus.ACTIVE },
    include: { paymentProvider: { select: { status: true } } },
  })
  const usable = activeAccounts.filter(
    (a) => a.paymentProvider.status === "ACTIVE" && isEnvironmentActivatable(a.environment),
  )
  if (usable.length === 0) {
    throw new ApiError(
      422,
      `Activate at least one provider account for this country before activating its financial configuration (deployment runs ${expectedProviderEnvironment()} accounts)`,
      "PROVIDER_ACCOUNT_NOT_CONFIGURED",
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
    throw new ApiError(400, "This financial configuration is archived — restore it first", "CONFIG_ARCHIVED")
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

/**
 * Bring an archived (DISABLED) financial config back as a DRAFT — it must be
 * re-activated (currency + active provider account re-validated) before the
 * country can operate financially again. Archiving is reversible; it is not
 * deletion. Same "unarchive" semantics as restoreProviderAccount.
 */
export async function restoreConfig(countryId: string, actorId: string, scope: AdminScopeContext) {
  assertGlobalFinanceScope(scope)
  const config = await loadConfig(countryId)
  if (!config) throw new ApiError(404, "Financial config not found", "CONFIG_NOT_FOUND")
  if (config.status !== CountryFinancialConfigStatus.DISABLED) {
    throw new ApiError(400, "Only an archived financial config can be restored", "NOT_ARCHIVED")
  }

  const updated = await prisma.countryFinancialConfig.update({
    where: { countryId },
    data: { status: CountryFinancialConfigStatus.DRAFT, disabledAt: null, disabledByAdminId: null },
    include: CONFIG_INCLUDE,
  })

  serviceLog.info({ countryId, actorId }, "Financial config restored to DRAFT")
  auditService.log({
    adminUserId: actorId,
    action: "country_financial_config.restored",
    entityType: "CountryFinancialConfig",
    entityId: countryId,
    changes: { before: { status: "DISABLED" }, after: { status: "DRAFT" } },
    metadata: { countryId },
  })
  return updated
}

//* Combined view for the Admin ERP 

export async function getCountryFinancialConfigView(countryId: string, scope: AdminScopeContext) {
  assertCountryFinanceConfigScope(scope, countryId)
  const country = await loadCountryOr404(countryId)

  const loadedConfig = await loadConfig(countryId)
  // Currency belongs to the country — converge the config onto it before
  // computing readiness so a DRAFT / never-set config reflects the truth.
  const config = loadedConfig
    ? await syncConfigCurrencyFromCountry(countryId, loadedConfig, country.currencyCode)
    : null

  const [providerAccountRows, readiness, providerGateway, paymentMethods] = await Promise.all([
    prisma.countryProviderAccount.findMany({
      where: { countryId },
      include: {
        paymentProvider: {
          select: { id: true, code: true, name: true, status: true, capabilities: true, supportedCurrencies: true },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    getFinancialReadiness(countryId),
    getProviderGatewayStatus(countryId),
    listCountryPaymentMethods(countryId, scope),
  ])

  // Provider-specific currency support is resolved HERE (finance/provider
  // layer), never in the admin UI, and PER ACCOUNT — a country may route
  // different capabilities through different providers whose currency
  // support differs. The country owns the currency; this only validates it.
  const currencyCode = config?.currencyCode ?? null
  const providerAccounts = providerAccountRows.map((a) => {
    const { supportedCurrencies: _sc, ...provider } = a.paymentProvider
    return {
      ...a,
      secretAlias: "***",
      paymentProvider: provider,
      currencySupported: currencyCode
        ? resolveProviderCurrency(currencyCode, a.paymentProvider).supported
        : undefined,
    }
  })

  return {
    config,
    providerAccounts,
    readiness,
    providerGateway,
    // listCountryPaymentMethods selects no secret material on the linked
    // account (id/status/environment/label/capabilities/provider only).
    paymentMethods,
    // The country's currency string (legacy) — shown read-only in the ERP;
    // config.currencyCode / config.currency is the resolved reference row.
    countryCurrency: country.currency,
    canManageDraft: scope.isGlobal || scope.countryIds.includes(countryId),
    canManageLifecycle: scope.isGlobal,
  }
}
