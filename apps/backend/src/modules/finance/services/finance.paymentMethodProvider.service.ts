import { prisma } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/errors/ApiError"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"
import { assertCountryFinanceConfigScope, assertFinanceRecordVisibleOr404 } from "../lib/scope"
import { methodProviderAccountProblem } from "../providers/provider.capabilities"

const serviceLog = logger.child({ module: "finance-payment-method-provider" })

/*
 * finance.paymentMethodProvider.service — wires each CountryPaymentMethod to
 * the CountryProviderAccount that actually executes it (Phase 1C).
 *
 * Before this, "which provider handles M-Pesa collection in Kenya?" could
 * only be inferred from capability overlap. Now it's an explicit link, and
 * readiness (finance.readiness.compute) reasons about it.
 *
 * Guarantees:
 *   - a method can only reference a provider account in its OWN country
 *     (DB-enforced via the composite FK; re-checked here for a clean 404)
 *   - the account must enable the capability the method needs
 *     (INBOUND -> collection capability for the method type;
 *      OUTBOUND -> payout capability for the method type)
 *   - a DISABLED account can't back a method
 *   - the linked method is only "operational" if BOTH it and the account
 *     are active — enforced in the readiness layer, not by blocking the link
 */

const METHOD_INCLUDE = {
  paymentMethod: { select: { id: true, code: true, name: true, type: true } },
  countryProviderAccount: {
    select: {
      id: true,
      status: true,
      environment: true,
      accountLabel: true,
      enabledCapabilities: true,
      paymentProvider: { select: { code: true, name: true, status: true } },
    },
  },
} as const

async function loadMethod(countryPaymentMethodId: string) {
  const method = await prisma.countryPaymentMethod.findUnique({
    where: { id: countryPaymentMethodId },
    include: METHOD_INCLUDE,
  })
  if (!method) throw new ApiError(404, "Payment method not found", "NOT_FOUND")
  return method
}

const PROBLEM_MESSAGE: Record<string, string> = {
  ACCOUNT_DISABLED: "That provider account is disabled and cannot back a payment method",
  METHOD_NOT_PAYABLE: "This payment method's type and direction cannot be routed through any provider account",
  CAPABILITY_NOT_ENABLED: "That provider account does not enable the capability this payment method requires",
}

export async function listCountryPaymentMethods(countryId: string, scope: AdminScopeContext) {
  assertCountryFinanceConfigScope(scope, countryId)
  const methods = await prisma.countryPaymentMethod.findMany({
    where: { countryId },
    include: METHOD_INCLUDE,
    orderBy: [{ direction: "asc" }, { displayOrder: "asc" }],
  })
  return methods
}

export async function setPaymentMethodProviderAccount(
  countryPaymentMethodId: string,
  countryProviderAccountId: string | null,
  actorId: string,
  scope: AdminScopeContext,
) {
  const method = await loadMethod(countryPaymentMethodId)
  // Opaque id — a caller who can't see the owning country gets a 404.
  assertFinanceRecordVisibleOr404(method.countryId, scope, "Payment method")

  let account: { id: string; status: string; enabledCapabilities: string[] } | null = null
  if (countryProviderAccountId) {
    const found = await prisma.countryProviderAccount.findUnique({
      where: { id: countryProviderAccountId },
      select: { id: true, countryId: true, status: true, enabledCapabilities: true },
    })
    // Missing OR another country's account -> indistinguishable "not found".
    if (!found || found.countryId !== method.countryId) {
      throw new ApiError(404, "Provider account not found", "NOT_FOUND")
    }
    account = found

    const problem = methodProviderAccountProblem({
      methodType: method.paymentMethod.type,
      direction: method.direction,
      account: found,
    })
    if (problem) {
      throw new ApiError(422, PROBLEM_MESSAGE[problem] ?? "Incompatible provider account", problem)
    }
  }

  if (method.countryProviderAccountId === countryProviderAccountId) {
    throw new ApiError(400, "Payment method is already wired to this provider account", "NO_CHANGE")
  }

  const updated = await prisma.countryPaymentMethod.update({
    where: { id: countryPaymentMethodId },
    data: { countryProviderAccountId },
    include: METHOD_INCLUDE,
  })

  serviceLog.info(
    { countryPaymentMethodId, countryProviderAccountId, actorId, countryId: method.countryId },
    "Payment method provider account changed",
  )
  auditService.log({
    adminUserId: actorId,
    action: "country_payment_method.provider_account_changed",
    entityType: "CountryPaymentMethod",
    entityId: countryPaymentMethodId,
    changes: {
      before: { countryProviderAccountId: method.countryProviderAccountId },
      after: { countryProviderAccountId },
    },
    metadata: {
      countryId: method.countryId,
      method: method.paymentMethod.code,
      direction: method.direction,
    },
  })

  return updated
}
