import { prisma, VendorApplicationStatus, VendorStatus, type AppealSubjectType, type AppealStatus } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/errors/ApiError"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"
import { getCountryIdFromSlug } from "../helpers/get-country-id.helper"
import { toCsv } from "@/lib/csv"

const serviceLog = logger.child({ module: "admin-vendor-appeal-service" })

/*
 * Roadmap VM-P1-04 (CLAUDE.md) — admin-side log/track/resolve of a formal
 * appeal against a rejected application, a suspension, or a ban. See the
 * VendorAppeal model comment in schema.prisma for why this is deliberately
 * simpler than the compliance-case/application claim+escalate workflows
 * (no claim-race lockout, no escalation pool) and why resolving an appeal
 * OVERTURNED never auto-reverses the underlying decision.
 */

function assertCountryInScope(countryId: string, scope: AdminScopeContext): void {
  if (!scope.isGlobal && !scope.countryIds.includes(countryId)) {
    throw new ApiError(403, "This is outside your scope", "SCOPE_FORBIDDEN")
  }
}

const RESOLVED_STATUSES: AppealStatus[] = ["UPHELD", "OVERTURNED"]

/*
 * Validates the subject exists, is in scope, and is actually in the
 * adverse state subjectType claims — guards against logging an appeal
 * against a decision that isn't current (e.g. the vendor was already
 * reinstated through another channel) or against a mismatched subject.
 */
async function resolveAndValidateSubject(
  subjectType  : AppealSubjectType,
  applicationId: string | undefined,
  vendorId     : string | undefined,
  scope        : AdminScopeContext,
): Promise<{ countryId: string }> {
  if (subjectType === "APPLICATION_REJECTION") {
    if (!applicationId) throw new ApiError(400, "applicationId is required", "MISSING_FIELDS")
    const application = await prisma.vendorApplication.findUnique({
      where : { id: applicationId },
      select: { id: true, countryId: true, status: true },
    })
    if (!application) throw new ApiError(404, "Application not found", "NOT_FOUND")
    assertCountryInScope(application.countryId, scope)
    if (application.status !== VendorApplicationStatus.REJECTED) {
      throw new ApiError(400, "This application was not rejected — nothing to appeal", "INVALID_STATUS")
    }
    return { countryId: application.countryId }
  }

  if (!vendorId) throw new ApiError(400, "vendorId is required", "MISSING_FIELDS")
  const vendor = await prisma.vendorAccount.findUnique({
    where : { id: vendorId },
    select: { id: true, countryId: true, status: true, deletedAt: true, userId: true },
  })
  if (!vendor || vendor.deletedAt) throw new ApiError(404, "Vendor account not found", "NOT_FOUND")
  assertCountryInScope(vendor.countryId, scope)

  if (subjectType === "ACCOUNT_SUSPENSION") {
    if (vendor.status !== VendorStatus.SUSPENDED) {
      throw new ApiError(400, "This vendor account is not suspended — nothing to appeal", "INVALID_STATUS")
    }
  } else {
    const vendorUser = vendor.userId
      ? await prisma.vendorUser.findUnique({ where: { id: vendor.userId }, select: { isBanned: true } })
      : null
    if (!vendorUser?.isBanned) {
      throw new ApiError(400, "This vendor is not banned — nothing to appeal", "INVALID_STATUS")
    }
  }
  return { countryId: vendor.countryId }
}

export async function logAppeal(
  input: { subjectType: AppealSubjectType; applicationId?: string; vendorId?: string; reason: string },
  actorId   : string,
  actorScope: AdminScopeContext,
) {
  const { subjectType, applicationId, vendorId, reason } = input
  if (!reason?.trim()) throw new ApiError(400, "reason is required", "MISSING_FIELDS")

  await resolveAndValidateSubject(subjectType, applicationId, vendorId, actorScope)

  const appeal = await prisma.vendorAppeal.create({
    data: {
      subjectType,
      applicationId   : subjectType === "APPLICATION_REJECTION" ? applicationId : null,
      vendorId        : subjectType === "APPLICATION_REJECTION" ? null : vendorId,
      reason          : reason.trim(),
      status          : "OPEN",
      createdByAdminId: actorId,
    },
  })

  serviceLog.info({ appealId: appeal.id, subjectType, actorId }, "Vendor appeal logged")
  auditService.log({
    adminUserId: actorId,
    action     : "vendor_appeal.logged",
    entityType : "VendorAppeal",
    entityId   : appeal.id,
    changes    : { after: { subjectType, applicationId: appeal.applicationId, vendorId: appeal.vendorId } },
  })

  return appeal
}

async function getAppealWithScope(appealId: string, scope: AdminScopeContext) {
  const appeal = await prisma.vendorAppeal.findUnique({
    where  : { id: appealId },
    include: {
      application: { select: { id: true, legalBusinessName: true, countryId: true } },
      vendor     : { select: { id: true, legalBusinessName: true, countryId: true } },
    },
  })
  if (!appeal) throw new ApiError(404, "Appeal not found", "NOT_FOUND")
  const countryId = appeal.application?.countryId ?? appeal.vendor?.countryId
  if (!countryId) throw new ApiError(500, "Appeal has no resolvable country", "DATA_INTEGRITY")
  assertCountryInScope(countryId, scope)
  return appeal
}

async function attachAdminNames<T extends { assignedReviewerId: string | null; resolvedByAdminId: string | null; createdByAdminId: string }>(
  rows: T[],
) {
  const adminIds = [...new Set(rows.flatMap((r) => [r.assignedReviewerId, r.resolvedByAdminId, r.createdByAdminId]).filter((id): id is string => !!id))]
  const adminMap = adminIds.length > 0
    ? new Map(
        (await prisma.adminUser.findMany({ where: { id: { in: adminIds } }, select: { id: true, firstName: true, lastName: true } }))
          .map((a) => [a.id, `${a.firstName} ${a.lastName}`.trim()]),
      )
    : new Map<string, string>()

  return rows.map((r) => ({
    ...r,
    assignedReviewerName: r.assignedReviewerId ? adminMap.get(r.assignedReviewerId) ?? null : null,
    resolvedByAdminName : r.resolvedByAdminId ? adminMap.get(r.resolvedByAdminId) ?? null : null,
    createdByAdminName  : adminMap.get(r.createdByAdminId) ?? null,
  }))
}

export async function getAppeal(appealId: string, scope: AdminScopeContext) {
  const appeal = await getAppealWithScope(appealId, scope)
  const [enriched] = await attachAdminNames([appeal])
  return enriched
}

interface AppealFilters {
  status?     : AppealStatus
  subjectType?: AppealSubjectType
  countrySlug?: string
  search?     : string
}

//* Shared where-builder — used by both listAppeals and exportAppealsCsv
//* (same "export can never drift from the page" convention used
//* throughout this pass — see buildApplicationsWhere for the original).
async function buildAppealsWhere(params: AppealFilters, scope: AdminScopeContext) {
  const { status, subjectType, search } = params
  const countryId = params.countrySlug ? await getCountryIdFromSlug(params.countrySlug, scope) : undefined
  const countryFilter = scope.isGlobal
    ? (countryId ? { countryId } : {})
    : { countryId: { in: scope.countryIds } }

  return {
    ...(status ? { status } : {}),
    ...(subjectType ? { subjectType } : {}),
    OR: [{ application: countryFilter }, { vendor: countryFilter }],
    ...(search
      ? {
          AND: [{
            OR: [
              { application: { legalBusinessName: { contains: search, mode: "insensitive" as const } } },
              { vendor: { legalBusinessName: { contains: search, mode: "insensitive" as const } } },
            ],
          }],
        }
      : {}),
  }
}

export async function listAppeals(
  scope : AdminScopeContext,
  params: AppealFilters & { page?: number; pageSize?: number } = {},
) {
  const { page = 1, pageSize = 20 } = params
  const skip = (page - 1) * pageSize

  const where = await buildAppealsWhere(params, scope)

  const [appeals, total] = await Promise.all([
    prisma.vendorAppeal.findMany({
      where,
      skip,
      take   : pageSize,
      include: {
        application: { select: { id: true, legalBusinessName: true, countryId: true } },
        vendor     : { select: { id: true, legalBusinessName: true, countryId: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vendorAppeal.count({ where }),
  ])

  const enriched = await attachAdminNames(appeals)

  return {
    appeals: enriched.map((a) => ({
      ...a,
      subjectName: a.application?.legalBusinessName ?? a.vendor?.legalBusinessName ?? "—",
      countryId  : a.application?.countryId ?? a.vendor?.countryId ?? null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

const MAX_APPEALS_EXPORT_ROWS = 5000

export async function exportAppealsCsv(scope: AdminScopeContext, params: AppealFilters = {}): Promise<string> {
  const where = await buildAppealsWhere(params, scope)
  const rows = await prisma.vendorAppeal.findMany({
    where,
    take   : MAX_APPEALS_EXPORT_ROWS,
    orderBy: { createdAt: "desc" },
    include: {
      application: { select: { legalBusinessName: true } },
      vendor     : { select: { legalBusinessName: true } },
    },
  })
  return toCsv(rows.map((a) => ({
    subject       : a.application?.legalBusinessName ?? a.vendor?.legalBusinessName ?? "",
    subjectType   : a.subjectType,
    status        : a.status,
    reason        : a.reason,
    resolutionNote: a.resolutionNote ?? "",
    createdAt     : a.createdAt.toISOString().slice(0, 10),
    resolvedAt    : a.resolvedAt ? a.resolvedAt.toISOString().slice(0, 10) : "",
  })), [
    { key: "subject",        label: "Subject" },
    { key: "subjectType",    label: "Subject Type" },
    { key: "status",         label: "Status" },
    { key: "reason",         label: "Reason" },
    { key: "resolutionNote", label: "Resolution Note" },
    { key: "createdAt",      label: "Logged" },
    { key: "resolvedAt",     label: "Resolved" },
  ])
}

export async function assignAppeal(
  appealId  : string,
  reviewerId: string | null,
  actorId   : string,
  actorScope: AdminScopeContext,
) {
  const appeal = await getAppealWithScope(appealId, actorScope)
  if (RESOLVED_STATUSES.includes(appeal.status)) {
    throw new ApiError(400, "This appeal is already resolved", "ALREADY_RESOLVED")
  }

  const updated = await prisma.vendorAppeal.update({
    where: { id: appealId },
    data : {
      assignedReviewerId: reviewerId,
      assignedAt        : reviewerId ? new Date() : null,
      status            : reviewerId ? "UNDER_REVIEW" : "OPEN",
    },
  })

  auditService.log({
    adminUserId: actorId,
    action     : reviewerId ? "vendor_appeal.assigned" : "vendor_appeal.unassigned",
    entityType : "VendorAppeal",
    entityId   : appealId,
    changes    : { before: { assignedReviewerId: appeal.assignedReviewerId }, after: { assignedReviewerId: reviewerId } },
  })

  return updated
}

export async function resolveAppeal(
  appealId      : string,
  outcome       : "UPHELD" | "OVERTURNED",
  resolutionNote: string | undefined,
  actorId       : string,
  actorScope    : AdminScopeContext,
) {
  const appeal = await getAppealWithScope(appealId, actorScope)
  if (RESOLVED_STATUSES.includes(appeal.status)) {
    throw new ApiError(400, "This appeal is already resolved", "ALREADY_RESOLVED")
  }

  const updated = await prisma.vendorAppeal.update({
    where: { id: appealId },
    data : {
      status           : outcome,
      resolvedAt       : new Date(),
      resolvedByAdminId: actorId,
      resolutionNote   : resolutionNote?.trim() || null,
    },
  })

  serviceLog.info({ appealId, outcome, actorId }, "Vendor appeal resolved")
  auditService.log({
    adminUserId: actorId,
    action     : "vendor_appeal.resolved",
    entityType : "VendorAppeal",
    entityId   : appealId,
    changes    : { before: { status: appeal.status }, after: { status: outcome, resolutionNote: resolutionNote?.trim() || null } },
  })

  return updated
}
