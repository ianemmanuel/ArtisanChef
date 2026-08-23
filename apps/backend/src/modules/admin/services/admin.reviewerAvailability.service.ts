import { prisma, AdminReviewAvailability, AdminScopeType, VendorApplicationStatus } from "@repo/db"
import { ApiError } from "@/errors/ApiError"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"
import type { AdminScopeContext } from "@repo/types/backend"

const serviceLog = logger.child({ module: "admin-reviewer-availability-service" })

export interface SetAvailabilityInput {
  availability      : AdminReviewAvailability
  unavailableFrom?  : Date
  unavailableUntil? : Date
  unavailableReason?: string
}

/*
 * Shared by both self-service and admin-managed availability changes —
 * the only difference between them is who's allowed to call it and
 * whether the audit event records a self-change. Setting AVAILABLE
 * clears the unavailable* fields; setting UNAVAILABLE without an
 * explicit unavailableFrom defaults it to now.
 *
 * Exported so the identity module (admin.user.service.ts) can reuse it
 * for the Identity & Access-managed "mark unavailable" action, which
 * follows the full admin-hierarchy scope rules rather than just the
 * vendor-reviewer scope check below.
 */
export async function applyAvailabilityChange(
  targetAdminId: string,
  input        : SetAvailabilityInput,
  actorId      : string,
  isSelfChange : boolean,
) {
  const target = await prisma.adminUser.findUnique({
    where : { id: targetAdminId },
    select: { id: true, reviewAvailability: true },
  })
  if (!target) throw new ApiError(404, "Admin not found", "NOT_FOUND")

  const data = input.availability === AdminReviewAvailability.AVAILABLE
    ? {
        reviewAvailability: AdminReviewAvailability.AVAILABLE,
        unavailableFrom   : null,
        unavailableUntil  : null,
        unavailableReason : null,
      }
    : {
        reviewAvailability: AdminReviewAvailability.UNAVAILABLE,
        unavailableFrom   : input.unavailableFrom ?? new Date(),
        unavailableUntil  : input.unavailableUntil ?? null,
        unavailableReason : input.unavailableReason ?? null,
      }

  const updated = await prisma.adminUser.update({ where: { id: targetAdminId }, data })

  serviceLog.info({ targetAdminId, actorId, isSelfChange, availability: input.availability }, "Reviewer availability changed")
  auditService.log({
    adminUserId: actorId,
    action     : "admin_user.availability_changed",
    entityType : "AdminUser",
    entityId   : targetAdminId,
    changes    : {
      before: { reviewAvailability: target.reviewAvailability },
      after : { reviewAvailability: input.availability },
    },
    metadata: {
      isSelfChange,
      changedByAdminId: actorId,
      targetAdminId,
      unavailableReason: input.unavailableReason ?? null,
    },
  })

  return updated
}

export async function setOwnAvailability(actorId: string, input: SetAvailabilityInput) {
  return applyAvailabilityChange(actorId, input, actorId, true)
}

export async function setReviewerAvailability(
  targetAdminId: string,
  input        : SetAvailabilityInput,
  actorId      : string,
  actorScope   : AdminScopeContext,
) {
  if (!actorScope.isGlobal) {
    const targetInScope = await prisma.adminUserScope.findFirst({
      where: {
        adminUserId: targetAdminId,
        OR: [
          { scopeType: AdminScopeType.COUNTRY, countryId: { in: actorScope.countryIds } },
          { scopeType: AdminScopeType.CITY, cityId: { in: actorScope.cityIds } },
        ],
      },
      select: { id: true },
    })
    if (!targetInScope) {
      throw new ApiError(403, "This admin is outside your scope", "SCOPE_FORBIDDEN")
    }
  }

  return applyAvailabilityChange(targetAdminId, input, actorId, false)
}

/*
 * "Expose enough information for authorized admins to identify
 * applications assigned to unavailable reviewers" — raw counts only,
 * no SLA computation (no SLA concept exists in the schema yet). Two
 * queries total: unavailable admins in scope, then one groupBy for
 * their caseload — no N+1.
 */
export async function listUnavailableReviewersWithCaseload(actorScope: AdminScopeContext) {
  const scopeFilter = actorScope.isGlobal
    ? {}
    : {
        scopes: {
          some: {
            OR: [
              { scopeType: AdminScopeType.COUNTRY, countryId: { in: actorScope.countryIds } },
              { scopeType: AdminScopeType.CITY, cityId: { in: actorScope.cityIds } },
            ],
          },
        },
      }

  const unavailable = await prisma.adminUser.findMany({
    where : { reviewAvailability: AdminReviewAvailability.UNAVAILABLE, ...scopeFilter },
    select: {
      id               : true,
      firstName        : true,
      lastName         : true,
      email            : true,
      unavailableFrom  : true,
      unavailableUntil : true,
      unavailableReason: true,
    },
    orderBy: { unavailableFrom: "asc" },
  })

  if (unavailable.length === 0) return []

  const caseloadCounts = await prisma.vendorApplication.groupBy({
    by   : ["assignedReviewerId"],
    where: {
      assignedReviewerId: { in: unavailable.map((u) => u.id) },
      status: {
        in: [
          VendorApplicationStatus.SUBMITTED,
          VendorApplicationStatus.UNDER_REVIEW,
          VendorApplicationStatus.NEEDS_REVISION,
        ],
      },
    },
    _count: true,
  })

  const countByReviewer = new Map(caseloadCounts.map((c) => [c.assignedReviewerId, c._count]))

  return unavailable.map((u) => ({
    adminUserId  : u.id,
    firstName    : u.firstName,
    lastName     : u.lastName,
    email        : u.email,
    unavailableFrom  : u.unavailableFrom,
    unavailableUntil : u.unavailableUntil,
    unavailableReason: u.unavailableReason,
    assignedApplicationCount: countByReviewer.get(u.id) ?? 0,
  }))
}
