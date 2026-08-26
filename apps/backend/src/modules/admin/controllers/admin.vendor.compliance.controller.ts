import { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { ApiError } from "@/errors/ApiError"
import {
  getExpiringDocuments,
  getExpiredDocuments,
  getComplianceOverview,
  exportComplianceIssuesCsv,
  createComplianceWaiver,
  revokeComplianceWaiver,
  notifyVendorAboutComplianceIssue,
  type ComplianceIssueStatus,
  type ComplianceIssueKind,
} from "../services/admin.vendor.compliance.service"
import { claimComplianceCase, escalateComplianceCase, reassignComplianceCase, listEligibleComplianceTargets } from "../services/admin.vendor.compliance-case.service"
import { AdminPermissions } from "@repo/types/enums"

export const handleGetExpiringDocuments: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { countrySlug, withinDays, page, pageSize } = req.query

    const result = await getExpiringDocuments(adminScope, {
      countrySlug: countrySlug as string | undefined,
      withinDays : withinDays ? parseInt(withinDays as string) : undefined,
      page       : page       ? parseInt(page       as string) : undefined,
      pageSize   : pageSize   ? parseInt(pageSize    as string) : undefined,
    })
    return sendSuccess(res, result, "Expiring documents fetched")
  } catch (err) { next(err) }
}

export const handleGetExpiredDocuments: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { countrySlug, page, pageSize } = req.query

    const result = await getExpiredDocuments(adminScope, {
      countrySlug: countrySlug as string | undefined,
      page       : page       ? parseInt(page     as string) : undefined,
      pageSize   : pageSize   ? parseInt(pageSize as string) : undefined,
    })
    return sendSuccess(res, result, "Expired documents fetched")
  } catch (err) { next(err) }
}

export const handleGetComplianceOverview: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { status, countrySlug, documentTypeId, search, queue, withinDays, page, pageSize } = req.query

    const result = await getComplianceOverview(adminScope, {
      status        : status as ComplianceIssueStatus | undefined,
      countrySlug   : countrySlug    as string | undefined,
      documentTypeId: documentTypeId as string | undefined,
      search        : search         as string | undefined,
      queue         : queue          as string | undefined,
      actorId       : adminUser.id,
      withinDays    : withinDays ? parseInt(withinDays as string) : undefined,
      page          : page       ? parseInt(page       as string) : undefined,
      pageSize      : pageSize   ? parseInt(pageSize    as string) : undefined,
    })
    return sendSuccess(res, result, "Compliance overview fetched")
  } catch (err) { next(err) }
}

export const handleExportComplianceIssuesCsv: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { status, countrySlug, documentTypeId, search, queue } = req.query

    const csv = await exportComplianceIssuesCsv(adminScope, {
      status        : status as ComplianceIssueStatus | undefined,
      countrySlug   : countrySlug    as string | undefined,
      documentTypeId: documentTypeId as string | undefined,
      search        : search         as string | undefined,
      queue         : queue          as string | undefined,
      actorId       : adminUser.id,
    })
    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader("Content-Disposition", `attachment; filename="vendor-compliance-${new Date().toISOString().slice(0, 10)}.csv"`)
    return res.status(200).send(csv)
  } catch (err) { next(err) }
}

export const handleClaimComplianceCase: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope, adminPermissions } = req as unknown as AdminRequest
    const { vendorId, documentTypeId, issueType } = req.body as {
      vendorId?: string; documentTypeId?: string; issueType?: ComplianceIssueKind
    }
    if (!vendorId?.trim() || !documentTypeId?.trim() || !issueType) {
      throw new ApiError(400, "vendorId, documentTypeId, and issueType are required", "MISSING_FIELDS")
    }

    const result = await claimComplianceCase(vendorId, documentTypeId, issueType, adminUser.id, adminScope, adminPermissions)
    return sendSuccess(res, result, "Compliance case claimed")
  } catch (err) { next(err) }
}

export const handleEscalateComplianceCase: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope, adminPermissions } = req as unknown as AdminRequest
    const { vendorId, documentTypeId, issueType, reason } = req.body as {
      vendorId?: string; documentTypeId?: string; issueType?: ComplianceIssueKind; reason?: string
    }
    if (!vendorId?.trim() || !documentTypeId?.trim() || !issueType) {
      throw new ApiError(400, "vendorId, documentTypeId, and issueType are required", "MISSING_FIELDS")
    }

    const result = await escalateComplianceCase(vendorId, documentTypeId, issueType, reason ?? "", adminUser.id, adminScope, adminPermissions)
    return sendSuccess(res, result, "Compliance case escalated")
  } catch (err) { next(err) }
}

export const handleReassignComplianceCase: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { vendorId, documentTypeId, issueType, targetAdminId, reason } = req.body as {
      vendorId?: string; documentTypeId?: string; issueType?: ComplianceIssueKind; targetAdminId?: string; reason?: string
    }
    if (!vendorId?.trim() || !documentTypeId?.trim() || !issueType || !targetAdminId?.trim()) {
      throw new ApiError(400, "vendorId, documentTypeId, issueType, and targetAdminId are required", "MISSING_FIELDS")
    }

    const result = await reassignComplianceCase(vendorId, documentTypeId, issueType, targetAdminId, reason?.trim() || undefined, adminUser.id, adminScope)
    return sendSuccess(res, result, "Compliance case reassigned")
  } catch (err) { next(err) }
}

export const handleListEligibleComplianceTargets: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { vendorId, for: forWhat } = req.query as { vendorId?: string; for?: string }
    if (!vendorId?.trim()) throw new ApiError(400, "vendorId is required", "MISSING_FIELDS")

    const capability = forWhat === "escalate"
      ? AdminPermissions.VENDORS_COMPLIANCE_RECEIVE_ESCALATION
      : AdminPermissions.VENDORS_COMPLIANCE_CLAIM

    const targets = await listEligibleComplianceTargets(vendorId, adminScope, capability)
    return sendSuccess(res, targets, "Eligible targets fetched")
  } catch (err) { next(err) }
}

export const handleNotifyVendorAboutComplianceIssue: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { vendorId, documentTypeId, issueType } = req.body as {
      vendorId?: string; documentTypeId?: string; issueType?: ComplianceIssueKind
    }
    if (!vendorId?.trim() || !documentTypeId?.trim() || !issueType) {
      throw new ApiError(400, "vendorId, documentTypeId, and issueType are required", "MISSING_FIELDS")
    }

    const result = await notifyVendorAboutComplianceIssue(vendorId, documentTypeId, issueType, adminUser.id, adminScope)
    return sendSuccess(res, result, result.sent ? "Vendor notified" : "Notification recorded (email not sent — SMTP not configured)")
  } catch (err) { next(err) }
}

export const handleCreateComplianceWaiver: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { vendorId, documentTypeId, reason, expiresAt } = req.body as {
      vendorId?: string; documentTypeId?: string; reason?: string; expiresAt?: string
    }

    if (!vendorId?.trim() || !documentTypeId?.trim()) throw new ApiError(400, "vendorId and documentTypeId are required", "MISSING_FIELDS")
    if (!reason?.trim()) throw new ApiError(400, "reason is required", "MISSING_FIELDS")
    const expiresAtDate = expiresAt ? new Date(expiresAt) : null
    if (!expiresAtDate || Number.isNaN(expiresAtDate.getTime())) throw new ApiError(400, "A valid expiresAt is required", "INVALID_EXPIRY")

    const waiver = await createComplianceWaiver(
      vendorId, documentTypeId, { reason: reason.trim(), expiresAt: expiresAtDate },
      adminUser.id, adminScope,
    )
    return sendSuccess(res, waiver, "Compliance waiver granted", 201)
  } catch (err) { next(err) }
}

export const handleRevokeComplianceWaiver: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { waiverId } = req.params as { waiverId: string }
    const { reason } = req.body as { reason?: string }

    const waiver = await revokeComplianceWaiver(waiverId, reason?.trim() || undefined, adminUser.id, adminScope)
    return sendSuccess(res, waiver, "Compliance waiver revoked")
  } catch (err) { next(err) }
}
