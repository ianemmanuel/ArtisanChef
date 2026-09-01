import {
  prisma,
  CountryProviderAccountStatus,
  type PaymentEnvironment,
  type PaymentProviderCapability,
} from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/errors/ApiError"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"
import { assertGlobalFinanceScope, assertCountryFinanceConfigScope } from "../lib/scope"
import { isEnvironmentActivatable, expectedProviderEnvironment } from "../lib/environment"
import { enabledCapabilitiesNotSupported } from "../providers/provider.capabilities"
import type {
  CreateCountryProviderAccountInput,
  UpdateCountryProviderAccountInput,
} from "../schemas/finance.providerAccount.schema"

const serviceLog = logger.child({ module: "finance-provider-account-service" })

/*
 * CountryProviderAccount — "Kenya uses THIS Flutterwave account, in THIS
 * environment". Append-only: never hard-deleted (retire via DISABLED).
 * At most one ACTIVE per country (enforced in a transaction on activate).
 *
 * Scope:
 *   - create/edit DRAFT (non-secret fields) : own country OK (assertCountryFinanceConfigScope)
 *   - secretAlias / environment (structural), any edit to a non-DRAFT
 *     account, and all lifecycle actions : GLOBAL only (assertGlobalFinanceScope)
 */

const REDACT = "***"

async function loadProvider(paymentProviderId: string) {
  const provider = await prisma.paymentProvider.findUnique({ where: { id: paymentProviderId } })
  if (!provider) throw new ApiError(404, "Payment provider not found", "NOT_FOUND")
  return provider
}

async function loadAccount(id: string) {
  const account = await prisma.countryProviderAccount.findUnique({
    where: { id },
    include: { paymentProvider: { select: { id: true, code: true, name: true, status: true, capabilities: true } } },
  })
  if (!account) throw new ApiError(404, "Provider account not found", "NOT_FOUND")
  return account
}

/** Strips the secret alias from a returned account (defence — it's non-secret but no reason to surface it broadly). */
function redactAlias<T extends { secretAlias: string }>(account: T): T {
  return { ...account, secretAlias: REDACT }
}

function assertEnabledSubsetOfProvider(enabled: string[], providerCapabilities: string[]): void {
  const bad = enabledCapabilitiesNotSupported(enabled, providerCapabilities)
  if (bad.length > 0) {
    throw new ApiError(
      422,
      `The provider does not support: ${bad.join(", ")} — a country cannot enable a capability the provider lacks`,
      "CAPABILITY_NOT_SUPPORTED_BY_PROVIDER",
    )
  }
}

//* ─── Reads ──────────────────────────────────────────────────────────────

export async function listProviderAccounts(countryId: string, scope: AdminScopeContext) {
  assertCountryFinanceConfigScope(scope, countryId)
  const accounts = await prisma.countryProviderAccount.findMany({
    where: { countryId },
    include: { paymentProvider: { select: { id: true, code: true, name: true, status: true, capabilities: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  })
  return accounts.map(redactAlias)
}

export async function getProviderAccount(id: string, scope: AdminScopeContext) {
  const account = await loadAccount(id)
  assertCountryFinanceConfigScope(scope, account.countryId)
  return redactAlias(account)
}

//* ─── Create / edit ──────────────────────────────────────────────────────

export async function createProviderAccount(
  countryId: string,
  input: CreateCountryProviderAccountInput,
  actorId: string,
  scope: AdminScopeContext,
) {
  assertCountryFinanceConfigScope(scope, countryId)

  const country = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } })
  if (!country) throw new ApiError(404, "Country not found", "NOT_FOUND")

  const provider = await loadProvider(input.paymentProviderId)
  if (provider.status !== "ACTIVE") {
    throw new ApiError(400, "Cannot wire an inactive payment provider", "PROVIDER_INACTIVE")
  }
  assertEnabledSubsetOfProvider(input.enabledCapabilities, provider.capabilities)

  const account = await prisma.countryProviderAccount.create({
    data: {
      countryId,
      paymentProviderId: provider.id,
      environment: input.environment as PaymentEnvironment,
      secretAlias: input.secretAlias.trim(),
      enabledCapabilities: input.enabledCapabilities as PaymentProviderCapability[],
      accountLabel: input.accountLabel?.trim() || null,
      externalAccountId: input.externalAccountId?.trim() || null,
      status: CountryProviderAccountStatus.DRAFT,
      createdByAdminId: actorId,
    },
    include: { paymentProvider: { select: { id: true, code: true, name: true, status: true, capabilities: true } } },
  })

  serviceLog.info({ accountId: account.id, countryId, providerCode: provider.code, actorId }, "Provider account created (DRAFT)")
  auditService.log({
    adminUserId: actorId,
    action: "country_provider_account.created",
    entityType: "CountryProviderAccount",
    entityId: account.id,
    changes: {
      after: {
        countryId,
        provider: provider.code,
        environment: account.environment,
        enabledCapabilities: account.enabledCapabilities,
        // secretAlias deliberately omitted from the audit record
      },
    },
    metadata: { countryId },
  })

  return redactAlias(account)
}

export async function updateProviderAccount(
  id: string,
  input: UpdateCountryProviderAccountInput,
  actorId: string,
  scope: AdminScopeContext,
) {
  const account = await loadAccount(id)

  const touchesStructural = input.secretAlias !== undefined || input.environment !== undefined
  const isDraft = account.status === CountryProviderAccountStatus.DRAFT

  // Structural fields, or ANY edit to a non-DRAFT account → global only.
  if (touchesStructural || !isDraft) {
    assertGlobalFinanceScope(scope)
  } else {
    assertCountryFinanceConfigScope(scope, account.countryId)
  }
  if (account.status === CountryProviderAccountStatus.DISABLED) {
    throw new ApiError(400, "A disabled provider account cannot be edited", "ACCOUNT_DISABLED")
  }

  if (input.enabledCapabilities !== undefined) {
    assertEnabledSubsetOfProvider(input.enabledCapabilities, account.paymentProvider.capabilities)
  }

  const updated = await prisma.countryProviderAccount.update({
    where: { id },
    data: {
      ...(input.enabledCapabilities !== undefined ? { enabledCapabilities: input.enabledCapabilities as PaymentProviderCapability[] } : {}),
      ...(input.accountLabel !== undefined ? { accountLabel: input.accountLabel?.trim() || null } : {}),
      ...(input.externalAccountId !== undefined ? { externalAccountId: input.externalAccountId?.trim() || null } : {}),
      ...(input.secretAlias !== undefined ? { secretAlias: input.secretAlias.trim() } : {}),
      ...(input.environment !== undefined ? { environment: input.environment as PaymentEnvironment } : {}),
    },
    include: { paymentProvider: { select: { id: true, code: true, name: true, status: true, capabilities: true } } },
  })

  serviceLog.info({ accountId: id, actorId, structural: touchesStructural }, "Provider account updated")
  auditService.log({
    adminUserId: actorId,
    action: touchesStructural ? "country_provider_account.structural_changed" : "country_provider_account.updated",
    entityType: "CountryProviderAccount",
    entityId: id,
    changes: {
      before: {
        enabledCapabilities: account.enabledCapabilities,
        accountLabel: account.accountLabel,
        externalAccountId: account.externalAccountId,
        environment: account.environment,
        secretAliasChanged: input.secretAlias !== undefined ? true : undefined,
      },
      after: {
        enabledCapabilities: updated.enabledCapabilities,
        accountLabel: updated.accountLabel,
        externalAccountId: updated.externalAccountId,
        environment: updated.environment,
        secretAliasChanged: input.secretAlias !== undefined ? true : undefined,
      },
    },
    metadata: { countryId: account.countryId },
  })

  return redactAlias(updated)
}

//* ─── Lifecycle (GLOBAL scope only) ─────────────────────────────────────

export async function activateProviderAccount(id: string, actorId: string, scope: AdminScopeContext) {
  assertGlobalFinanceScope(scope)
  const account = await loadAccount(id)

  if (account.status === CountryProviderAccountStatus.ACTIVE) {
    throw new ApiError(400, "Provider account is already active", "ALREADY_ACTIVE")
  }
  if (account.status === CountryProviderAccountStatus.DISABLED) {
    throw new ApiError(400, "A disabled provider account cannot be reactivated — create a new one", "ACCOUNT_DISABLED")
  }
  if (account.paymentProvider.status !== "ACTIVE") {
    throw new ApiError(422, "The payment provider is inactive", "PROVIDER_INACTIVE")
  }
  assertEnabledSubsetOfProvider(account.enabledCapabilities, account.paymentProvider.capabilities)
  if (account.enabledCapabilities.length === 0) {
    throw new ApiError(422, "Enable at least one capability before activating this account", "NO_CAPABILITIES_ENABLED")
  }
  if (!isEnvironmentActivatable(account.environment)) {
    throw new ApiError(
      422,
      `This deployment can only activate ${expectedProviderEnvironment()} provider accounts (this one is ${account.environment})`,
      "PROVIDER_ENVIRONMENT_MISMATCH",
    )
  }

  const updated = await prisma.$transaction(async (tx) => {
    // At most one ACTIVE per country.
    const otherActive = await tx.countryProviderAccount.findFirst({
      where: { countryId: account.countryId, status: CountryProviderAccountStatus.ACTIVE, id: { not: id } },
      select: { id: true },
    })
    if (otherActive) {
      throw new ApiError(
        409,
        "This country already has an active provider account — suspend or disable it first",
        "ANOTHER_ACCOUNT_ACTIVE",
      )
    }
    return tx.countryProviderAccount.update({
      where: { id },
      data: {
        status: CountryProviderAccountStatus.ACTIVE,
        activatedAt: new Date(),
        activatedByAdminId: actorId,
        suspendedAt: null,
        suspendedByAdminId: null,
        suspensionReason: null,
      },
    })
  })

  serviceLog.info({ accountId: id, countryId: account.countryId, actorId }, "Provider account activated")
  auditService.log({
    adminUserId: actorId,
    action: "country_provider_account.activated",
    entityType: "CountryProviderAccount",
    entityId: id,
    changes: { before: { status: account.status }, after: { status: "ACTIVE" } },
    metadata: { countryId: account.countryId },
  })

  return redactAlias({ ...updated, paymentProvider: account.paymentProvider })
}

export async function suspendProviderAccount(id: string, reason: string, actorId: string, scope: AdminScopeContext) {
  assertGlobalFinanceScope(scope)
  if (!reason?.trim()) throw new ApiError(400, "A reason is required", "MISSING_FIELDS")
  const account = await loadAccount(id)
  if (account.status !== CountryProviderAccountStatus.ACTIVE) {
    throw new ApiError(400, "Only an active provider account can be suspended", "NOT_ACTIVE")
  }

  const updated = await prisma.countryProviderAccount.update({
    where: { id },
    data: {
      status: CountryProviderAccountStatus.SUSPENDED,
      suspendedAt: new Date(),
      suspendedByAdminId: actorId,
      suspensionReason: reason.trim(),
    },
  })

  serviceLog.warn({ accountId: id, countryId: account.countryId, actorId }, "Provider account suspended")
  auditService.log({
    adminUserId: actorId,
    action: "country_provider_account.suspended",
    entityType: "CountryProviderAccount",
    entityId: id,
    changes: { before: { status: "ACTIVE" }, after: { status: "SUSPENDED" } },
    metadata: { countryId: account.countryId, reason: reason.trim() },
  })

  return redactAlias({ ...updated, paymentProvider: account.paymentProvider })
}

export async function disableProviderAccount(id: string, actorId: string, scope: AdminScopeContext) {
  assertGlobalFinanceScope(scope)
  const account = await loadAccount(id)
  if (account.status === CountryProviderAccountStatus.DISABLED) {
    throw new ApiError(400, "Provider account is already disabled", "ALREADY_DISABLED")
  }

  const updated = await prisma.$transaction(async (tx) => {
    // If this account is the config's active pointer, clear it — a disabled
    // account can't be the active one. The config stays (now non-operational,
    // readiness will report PROVIDER_ACCOUNT_NOT_CONFIGURED). Existing
    // financial records are untouched.
    await tx.countryFinancialConfig.updateMany({
      where: { countryId: account.countryId, activeProviderAccountId: id },
      data: { activeProviderAccountId: null },
    })
    return tx.countryProviderAccount.update({
      where: { id },
      data: {
        status: CountryProviderAccountStatus.DISABLED,
        disabledAt: new Date(),
        disabledByAdminId: actorId,
      },
    })
  })

  serviceLog.warn({ accountId: id, countryId: account.countryId, actorId }, "Provider account disabled")
  auditService.log({
    adminUserId: actorId,
    action: "country_provider_account.disabled",
    entityType: "CountryProviderAccount",
    entityId: id,
    changes: { before: { status: account.status }, after: { status: "DISABLED" } },
    metadata: { countryId: account.countryId },
  })

  return redactAlias({ ...updated, paymentProvider: account.paymentProvider })
}
