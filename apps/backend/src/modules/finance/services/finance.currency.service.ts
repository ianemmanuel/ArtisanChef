import { prisma, FinanceReferenceStatus } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/errors/ApiError"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"
import { assertGlobalFinanceScope } from "../lib/scope"
import { isValidCurrencyCodeFormat, isValidMinorUnitDigits, normaliseCurrencyCode } from "../lib/currency"
import type { CreateCurrencyInput, UpdateCurrencyInput } from "../schemas/finance.currency.schema"

const serviceLog = logger.child({ module: "finance-currency-service" })

/*
 * Currency reference table. Exists so the finance domain never treats
 * currency as an arbitrary string — an amount is always (integer minor
 * units + a currency that resolves HERE, carrying its own minorUnitDigits).
 *
 * Same governance as the provider catalog: reads permission-gated only,
 * mutations additionally GLOBAL-scope-only.
 */

export async function listCurrencies(params: { status?: "ACTIVE" | "INACTIVE"; search?: string } = {}) {
  const { status, search } = params
  return prisma.currency.findMany({
    where: {
      ...(status ? { status: status as FinanceReferenceStatus } : {}),
      ...(search
        ? { OR: [{ code: { contains: search.toUpperCase() } }, { name: { contains: search, mode: "insensitive" as const } }] }
        : {}),
    },
    orderBy: { code: "asc" },
  })
}

export async function getCurrency(code: string) {
  const currency = await prisma.currency.findUnique({ where: { code: normaliseCurrencyCode(code) } })
  if (!currency) throw new ApiError(404, "Currency not found", "NOT_FOUND")
  return currency
}

export async function createCurrency(input: CreateCurrencyInput, actorId: string, scope: AdminScopeContext) {
  assertGlobalFinanceScope(scope)

  const code = normaliseCurrencyCode(input.code)
  if (!isValidCurrencyCodeFormat(code)) {
    throw new ApiError(400, "Currency code must be 3 uppercase letters (ISO-4217)", "INVALID_CURRENCY_CODE")
  }
  const minorUnitDigits = input.minorUnitDigits ?? 2
  if (!isValidMinorUnitDigits(minorUnitDigits)) {
    throw new ApiError(400, "minorUnitDigits must be one of 0, 2, 3, 4", "INVALID_MINOR_UNIT_DIGITS")
  }

  const existing = await prisma.currency.findUnique({ where: { code } })
  if (existing) throw new ApiError(409, `Currency "${code}" already exists`, "DUPLICATE_CURRENCY")

  const currency = await prisma.currency.create({
    data: {
      code,
      name: input.name.trim(),
      symbol: input.symbol?.trim() || null,
      minorUnitDigits,
      createdByAdminId: actorId,
    },
  })

  serviceLog.info({ code, actorId }, "Currency created")
  auditService.log({
    adminUserId: actorId,
    action: "currency.created",
    entityType: "Currency",
    entityId: code,
    changes: { after: { code, name: currency.name, minorUnitDigits } },
  })

  return currency
}

export async function updateCurrency(code: string, input: UpdateCurrencyInput, actorId: string, scope: AdminScopeContext) {
  assertGlobalFinanceScope(scope)
  const key = normaliseCurrencyCode(code)
  const existing = await prisma.currency.findUnique({ where: { code: key } })
  if (!existing) throw new ApiError(404, "Currency not found", "NOT_FOUND")

  if (input.minorUnitDigits != null && !isValidMinorUnitDigits(input.minorUnitDigits)) {
    throw new ApiError(400, "minorUnitDigits must be one of 0, 2, 3, 4", "INVALID_MINOR_UNIT_DIGITS")
  }

  const updated = await prisma.currency.update({
    where: { code: key },
    data: {
      ...(input.name != null ? { name: input.name.trim() } : {}),
      ...(input.symbol !== undefined ? { symbol: input.symbol?.trim() || null } : {}),
      ...(input.minorUnitDigits != null ? { minorUnitDigits: input.minorUnitDigits } : {}),
    },
  })

  serviceLog.info({ code: key, actorId }, "Currency updated")
  auditService.log({
    adminUserId: actorId,
    action: "currency.updated",
    entityType: "Currency",
    entityId: key,
    changes: {
      before: { name: existing.name, symbol: existing.symbol, minorUnitDigits: existing.minorUnitDigits },
      after: { name: updated.name, symbol: updated.symbol, minorUnitDigits: updated.minorUnitDigits },
    },
  })

  return updated
}

export async function setCurrencyStatus(
  code: string,
  status: "ACTIVE" | "INACTIVE",
  actorId: string,
  scope: AdminScopeContext,
) {
  assertGlobalFinanceScope(scope)
  const key = normaliseCurrencyCode(code)
  const existing = await prisma.currency.findUnique({ where: { code: key } })
  if (!existing) throw new ApiError(404, "Currency not found", "NOT_FOUND")
  if (existing.status === status) throw new ApiError(400, `Currency is already ${status}`, "NO_CHANGE")

  const updated = await prisma.currency.update({ where: { code: key }, data: { status: status as FinanceReferenceStatus } })

  serviceLog.info({ code: key, status, actorId }, "Currency status changed")
  auditService.log({
    adminUserId: actorId,
    action: status === "ACTIVE" ? "currency.activated" : "currency.deactivated",
    entityType: "Currency",
    entityId: key,
    changes: { before: { status: existing.status }, after: { status } },
  })

  return updated
}
