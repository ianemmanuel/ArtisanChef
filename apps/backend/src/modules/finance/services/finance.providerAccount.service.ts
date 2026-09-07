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
import {
  assertGlobalFinanceScope,
  assertCountryFinanceConfigScope,
  assertFinanceRecordVisibleOr404,
} from "../lib/scope"
import { isEnvironmentActivatable, expectedProviderEnvironment } from "../lib/environment"
import {
  enabledCapabilitiesNotSupported,
  resolveEnabledCapabilities,
  autoEnabledIntegrationCapabilities,
} from "../providers/provider.capabilities"
import { deriveProviderSecretAlias } from "../secrets/provider-secrets.resolver"
import type {
  CreateCountryProviderAccountInput,
  UpdateCountryProviderAccountInput,
} from "../schemas/finance.providerAccount.schema"

const serviceLog = logger.child({ module: "finance-provider-account-service" })

/*
 * CountryProviderAccount — "Kenya uses THIS Flutterwave account, in THIS
 * environment". Append-only: never hard-deleted (retire via DISABLED).
 *
 * A country may have MANY ACTIVE accounts at once — one per capability
 * domain (collection via Provider A, payout via Provider B, bank-account
 * verification via Provider C, or all three via one provider). There is no
 * "the country's active account": every runtime provider call resolves a
 * specific account by explicit routing context (method wiring for
 * collection/payout, CountryFinancialConfig.bankVerificationProviderAccountId
 * for bank verification). See finance.providerGateway.service.ts.
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
    include: {
      paymentProvider: { select: { id: true, code: true, name: true, status: true, capabilities: true } },
      country: { select: { code: true } },
    },
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
  // Opaque id → a caller who can't see the owning country gets a 404, not a
  // 403 that would confirm the account exists (see assertFinanceRecordVisibleOr404).
  assertFinanceRecordVisibleOr404(account.countryId, scope, "Provider account")
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

  const country = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true, code: true } })
  if (!country) throw new ApiError(404, "Country not found", "NOT_FOUND")

  const provider = await loadProvider(input.paymentProviderId)
  if (provider.status !== "ACTIVE") {
    throw new ApiError(400, "Cannot wire an inactive payment provider", "PROVIDER_INACTIVE")
  }

  // The admin picks business capabilities; integration capabilities
  // (webhooks / bank directory / account verification) are merged in from
  // what the provider supports. The secret alias is derived, not entered.
  const enabledCapabilities = resolveEnabledCapabilities(input.enabledCapabilities, provider.capabilities)
  assertEnabledSubsetOfProvider(enabledCapabilities, provider.capabilities)
  const secretAlias = deriveProviderSecretAlias(provider.code, country.code, input.environment)

  const account = await prisma.countryProviderAccount.create({
    data: {
      countryId,
      paymentProviderId: provider.id,
      environment: input.environment as PaymentEnvironment,
      secretAlias,
      enabledCapabilities: enabledCapabilities as PaymentProviderCapability[],
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
  // Visibility first (404 if the caller can't see the owning country) — must
  // come before the structural/global branching below, otherwise a
  // country-scoped caller probing a non-DRAFT account id would get a 403
  // that confirms it exists.
  assertFinanceRecordVisibleOr404(account.countryId, scope, "Provider account")

  const touchesStructural = input.environment !== undefined
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

  const nextCapabilities =
    input.enabledCapabilities !== undefined
      ? resolveEnabledCapabilities(input.enabledCapabilities, account.paymentProvider.capabilities)
      : undefined
  if (nextCapabilities) assertEnabledSubsetOfProvider(nextCapabilities, account.paymentProvider.capabilities)

  // Changing environment re-derives the secret alias (it's a deterministic
  // function of provider + country + environment).
  const nextSecretAlias =
    input.environment !== undefined
      ? deriveProviderSecretAlias(account.paymentProvider.code, account.country.code, input.environment)
      : undefined

  const updated = await prisma.countryProviderAccount.update({
    where: { id },
    data: {
      ...(nextCapabilities ? { enabledCapabilities: nextCapabilities as PaymentProviderCapability[] } : {}),
      ...(input.accountLabel !== undefined ? { accountLabel: input.accountLabel?.trim() || null } : {}),
      ...(input.externalAccountId !== undefined ? { externalAccountId: input.externalAccountId?.trim() || null } : {}),
      ...(input.environment !== undefined ? { environment: input.environment as PaymentEnvironment } : {}),
      ...(nextSecretAlias ? { secretAlias: nextSecretAlias } : {}),
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
      },
      after: {
        enabledCapabilities: updated.enabledCapabilities,
        accountLabel: updated.accountLabel,
        externalAccountId: updated.externalAccountId,
        environment: updated.environment,
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
    throw new ApiError(400, "This provider account is archived — restore it first", "ACCOUNT_ARCHIVED")
  }
  if (account.paymentProvider.status !== "ACTIVE") {
    throw new ApiError(422, "The payment provider is inactive", "PROVIDER_INACTIVE")
  }
  assertEnabledSubsetOfProvider(account.enabledCapabilities, account.paymentProvider.capabilities)
  if (account.enabledCapabilities.length === 0) {
    throw new ApiError(422, "Enable at least one capability before activating this account", "NO_CAPABILITIES_ENABLED")
  }

  // Heal integration capabilities on activation — an account created before
  // integration capabilities were auto-derived (or one whose provider later
  // gained one) still gets webhooks / bank directory / account verification
  // if its provider supports them. Only ever ADDS provider-declared caps.
  const healedCapabilities = [
    ...new Set([
      ...account.enabledCapabilities,
      ...autoEnabledIntegrationCapabilities(account.paymentProvider.capabilities),
    ]),
  ]
  if (!isEnvironmentActivatable(account.environment)) {
    throw new ApiError(
      422,
      `This deployment can only activate ${expectedProviderEnvironment()} provider accounts (this one is ${account.environment})`,
      "PROVIDER_ENVIRONMENT_MISMATCH",
    )
  }

  // A country may have multiple ACTIVE accounts (one per capability domain)
  // — there is no "only one ACTIVE" check. Which account serves which
  // capability is decided by explicit routing (payment-method wiring /
  // bank-verification binding), not by an implicit "the active one".
  const updated = await prisma.countryProviderAccount.update({
    where: { id },
    data: {
      status: CountryProviderAccountStatus.ACTIVE,
      activatedAt: new Date(),
      activatedByAdminId: actorId,
      suspendedAt: null,
      suspendedByAdminId: null,
      suspensionReason: null,
      ...(healedCapabilities.length !== account.enabledCapabilities.length
        ? { enabledCapabilities: healedCapabilities as PaymentProviderCapability[] }
        : {}),
    },
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
    // A disabled account must not stay referenced by any routing binding —
    // clear every pointer at it so nothing silently keeps routing to a dead
    // account. The config / methods stay (now non-operational for that
    // capability; readiness reports the specific gap). Existing financial
    // records are untouched — DISABLED is a retire, not a delete.
    await tx.countryFinancialConfig.updateMany({
      where: { countryId: account.countryId, bankVerificationProviderAccountId: id },
      data: { bankVerificationProviderAccountId: null },
    })
    await tx.countryPaymentMethod.updateMany({
      where: { countryId: account.countryId, countryProviderAccountId: id },
      data: { countryProviderAccountId: null },
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

/**
 * Bring an archived (DISABLED) provider account back as a DRAFT — it must be
 * re-enabled (and re-set as the country's primary account) before it can be
 * used again, so no archived set of credentials silently becomes live. This
 * is the "unarchive" every enterprise config surface has; archiving is
 * reversible, it is not deletion.
 */
export async function restoreProviderAccount(id: string, actorId: string, scope: AdminScopeContext) {
  assertGlobalFinanceScope(scope)
  const account = await loadAccount(id)
  if (account.status !== CountryProviderAccountStatus.DISABLED) {
    throw new ApiError(400, "Only an archived provider account can be restored", "NOT_ARCHIVED")
  }

  const updated = await prisma.countryProviderAccount.update({
    where: { id },
    data: {
      status: CountryProviderAccountStatus.DRAFT,
      disabledAt: null,
      disabledByAdminId: null,
    },
  })

  serviceLog.info({ accountId: id, countryId: account.countryId, actorId }, "Provider account restored to DRAFT")
  auditService.log({
    adminUserId: actorId,
    action: "country_provider_account.restored",
    entityType: "CountryProviderAccount",
    entityId: id,
    changes: { before: { status: "DISABLED" }, after: { status: "DRAFT" } },
    metadata: { countryId: account.countryId },
  })

  return redactAlias({ ...updated, paymentProvider: account.paymentProvider })
}
