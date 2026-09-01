import { prisma, FinanceReferenceStatus, type PaymentProviderCapability, type PaymentMethodType } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/errors/ApiError"
import { UUID_RE } from "@/constants/system"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"
import { assertGlobalFinanceScope } from "../lib/scope"
import { validateProviderCapabilityCoherence } from "../providers/provider.capabilities"
import type {
  ListPaymentProvidersQuery,
  CreatePaymentProviderInput,
  UpdatePaymentProviderInput,
} from "../schemas/finance.provider.schema"

const serviceLog = logger.child({ module: "finance-provider-service" })

/*
 * PaymentProvider CATALOG — the platform's knowledge of which provider
 * implementations exist and what each is expected to be able to do. NOT
 * credentials (those never touch the DB — see ProviderSecretsResolver).
 * NOT per-country wiring (CountryProviderAccount — a later phase).
 *
 * Governance mirrors admin.paymentMethod.service.ts exactly: reads are
 * permission-gated only; every mutation additionally requires GLOBAL
 * scope. This is platform-wide financial infrastructure.
 */

function normaliseCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_")
}

async function resolveProviderId(idOrCode: string): Promise<string> {
  const provider = await prisma.paymentProvider.findFirst({
    where: UUID_RE.test(idOrCode) ? { id: idOrCode } : { code: idOrCode.toUpperCase() },
    select: { id: true },
  })
  if (!provider) throw new ApiError(404, "Payment provider not found", "NOT_FOUND")
  return provider.id
}

function assertCoherentCapabilities(
  capabilities: string[],
  methodTypes: string[] | undefined,
  supportedCurrencies: string[] | undefined,
): void {
  const problems = validateProviderCapabilityCoherence({ capabilities, methodTypes, supportedCurrencies })
  if (problems.length > 0) {
    throw new ApiError(422, `Incoherent provider capabilities: ${problems.join("; ")}`, "PROVIDER_CAPABILITIES_INCOHERENT")
  }
}

export async function listPaymentProviders(params: ListPaymentProvidersQuery = {}) {
  const { search, status, page = 1, pageSize = 20 } = params
  const skip = (page - 1) * pageSize
  const where = {
    ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { code: { contains: search.toUpperCase() } }] } : {}),
    ...(status ? { status: status as FinanceReferenceStatus } : {}),
  }

  const [providers, total] = await Promise.all([
    prisma.paymentProvider.findMany({ where, skip, take: pageSize, orderBy: { name: "asc" } }),
    prisma.paymentProvider.count({ where }),
  ])

  return { providers, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

export async function getPaymentProvider(idOrCode: string) {
  const provider = await prisma.paymentProvider.findFirst({
    where: UUID_RE.test(idOrCode) ? { id: idOrCode } : { code: idOrCode.toUpperCase() },
  })
  if (!provider) throw new ApiError(404, "Payment provider not found", "NOT_FOUND")
  return provider
}

export async function createPaymentProvider(
  input: CreatePaymentProviderInput,
  actorId: string,
  scope: AdminScopeContext,
) {
  assertGlobalFinanceScope(scope)
  assertCoherentCapabilities(input.capabilities, input.methodTypes, input.supportedCurrencies)

  const code = normaliseCode(input.code)
  const existing = await prisma.paymentProvider.findUnique({ where: { code } })
  if (existing) throw new ApiError(409, `A payment provider with code "${code}" already exists`, "DUPLICATE_CODE")

  const provider = await prisma.paymentProvider.create({
    data: {
      code,
      name: input.name.trim(),
      capabilities: input.capabilities as PaymentProviderCapability[],
      methodTypes: (input.methodTypes ?? []) as PaymentMethodType[],
      supportedCurrencies: input.supportedCurrencies ?? [],
      description: input.description?.trim() || null,
      createdByAdminId: actorId,
    },
  })

  serviceLog.info({ paymentProviderId: provider.id, code, actorId }, "Payment provider created")
  auditService.log({
    adminUserId: actorId,
    action: "payment_provider.created",
    entityType: "PaymentProvider",
    entityId: provider.id,
    changes: { after: { code, name: provider.name, capabilities: provider.capabilities, methodTypes: provider.methodTypes } },
  })

  return provider
}

export async function updatePaymentProvider(
  idOrCode: string,
  input: UpdatePaymentProviderInput,
  actorId: string,
  scope: AdminScopeContext,
) {
  assertGlobalFinanceScope(scope)
  const id = await resolveProviderId(idOrCode)
  const existing = await prisma.paymentProvider.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, "Payment provider not found", "NOT_FOUND")

  const nextCapabilities = input.capabilities ?? existing.capabilities
  const nextMethodTypes = input.methodTypes ?? existing.methodTypes
  const nextCurrencies = input.supportedCurrencies ?? existing.supportedCurrencies
  assertCoherentCapabilities(nextCapabilities, nextMethodTypes, nextCurrencies)

  const updated = await prisma.paymentProvider.update({
    where: { id },
    data: {
      ...(input.name != null ? { name: input.name.trim() } : {}),
      ...(input.capabilities != null ? { capabilities: input.capabilities as PaymentProviderCapability[] } : {}),
      ...(input.methodTypes != null ? { methodTypes: input.methodTypes as PaymentMethodType[] } : {}),
      ...(input.supportedCurrencies != null ? { supportedCurrencies: input.supportedCurrencies } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
    },
  })

  serviceLog.info({ paymentProviderId: id, actorId }, "Payment provider updated")
  auditService.log({
    adminUserId: actorId,
    action: "payment_provider.updated",
    entityType: "PaymentProvider",
    entityId: id,
    changes: {
      before: { name: existing.name, capabilities: existing.capabilities, methodTypes: existing.methodTypes, supportedCurrencies: existing.supportedCurrencies, description: existing.description },
      after: { name: updated.name, capabilities: updated.capabilities, methodTypes: updated.methodTypes, supportedCurrencies: updated.supportedCurrencies, description: updated.description },
    },
  })

  return updated
}

export async function setPaymentProviderStatus(
  idOrCode: string,
  status: "ACTIVE" | "INACTIVE",
  actorId: string,
  scope: AdminScopeContext,
) {
  assertGlobalFinanceScope(scope)
  const id = await resolveProviderId(idOrCode)
  const existing = await prisma.paymentProvider.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, "Payment provider not found", "NOT_FOUND")
  if (existing.status === status) throw new ApiError(400, `Payment provider is already ${status}`, "NO_CHANGE")

  const updated = await prisma.paymentProvider.update({
    where: { id },
    data: { status: status as FinanceReferenceStatus },
  })

  serviceLog.info({ paymentProviderId: id, status, actorId }, "Payment provider status changed")
  auditService.log({
    adminUserId: actorId,
    action: status === "ACTIVE" ? "payment_provider.activated" : "payment_provider.deactivated",
    entityType: "PaymentProvider",
    entityId: id,
    changes: { before: { status: existing.status }, after: { status } },
  })

  return updated
}
