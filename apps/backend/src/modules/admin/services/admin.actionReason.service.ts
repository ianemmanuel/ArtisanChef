import { prisma } from "@repo/db"
import { ApiError } from "@/errors/ApiError"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"

const serviceLog = logger.child({ module: "admin-action-reason-service" })

export async function listActionReasons(filters: { appliesTo?: string; countryId?: string; activeOnly?: boolean }) {
  return prisma.adminActionReason.findMany({
    where: {
      ...(filters.appliesTo ? { appliesTo: { has: filters.appliesTo } } : {}),
      // countryId filter intentionally includes BOTH the country-specific
      // row (if any) and every global row — this is a listing endpoint,
      // not the single-reason resolver (see admin.vendor.service.ts's
      // resolveActionReason for the actual "pick one" resolution logic).
      ...(filters.countryId ? { OR: [{ countryId: filters.countryId }, { countryId: null }] } : {}),
      ...(filters.activeOnly ? { isActive: true } : {}),
    },
    orderBy: [{ countryId: "asc" }, { label: "asc" }],
  })
}

export async function getActionReason(id: string) {
  const reason = await prisma.adminActionReason.findUnique({ where: { id } })
  if (!reason) throw new ApiError(404, "Reason not found", "NOT_FOUND")
  return reason
}

export async function createActionReason(
  input: {
    code: string
    label: string
    description?: string
    appliesTo: string[]
    countryId?: string
  },
  actorId: string,
) {
  if (input.countryId) {
    const country = await prisma.country.findUnique({ where: { id: input.countryId }, select: { id: true } })
    if (!country) throw new ApiError(404, "Country not found", "NOT_FOUND")
  }

  const duplicate = await prisma.adminActionReason.findFirst({
    where: { code: input.code, countryId: input.countryId ?? null },
  })
  if (duplicate) {
    throw new ApiError(409, "A reason with this code already exists at this scope", "DUPLICATE_REASON")
  }

  const reason = await prisma.adminActionReason.create({
    data: {
      code       : input.code,
      label      : input.label,
      description: input.description ?? null,
      appliesTo  : input.appliesTo,
      countryId  : input.countryId ?? null,
    },
  })

  serviceLog.info({ reasonId: reason.id, actorId }, "Action reason created")
  auditService.log({
    adminUserId: actorId,
    action     : "admin_action_reason.created",
    entityType : "AdminActionReason",
    entityId   : reason.id,
    changes    : { after: { code: reason.code, countryId: reason.countryId } },
  })

  return reason
}

export async function updateActionReason(
  id: string,
  input: { label?: string; description?: string; appliesTo?: string[]; isActive?: boolean },
  actorId: string,
) {
  const existing = await prisma.adminActionReason.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, "Reason not found", "NOT_FOUND")

  const updated = await prisma.adminActionReason.update({
    where: { id },
    data : {
      ...(input.label != null ? { label: input.label } : {}),
      ...(input.description != null ? { description: input.description } : {}),
      ...(input.appliesTo != null ? { appliesTo: input.appliesTo } : {}),
      ...(input.isActive != null ? { isActive: input.isActive } : {}),
    },
  })

  serviceLog.info({ reasonId: id, actorId }, "Action reason updated")
  auditService.log({
    adminUserId: actorId,
    action     : "admin_action_reason.updated",
    entityType : "AdminActionReason",
    entityId   : id,
    changes    : { before: { isActive: existing.isActive }, after: { isActive: updated.isActive } },
  })

  return updated
}
