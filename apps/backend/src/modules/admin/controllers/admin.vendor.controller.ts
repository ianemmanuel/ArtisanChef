import { RequestHandler } from "express"
import { VendorApplicationStatus, VendorStatus } from "@repo/db"
import { AdminPermissions } from "@repo/types/enums"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { ApiError } from "@/errors/ApiError"
import {
  listApplications,
  getApplication,
  approveApplication,
  rejectApplication,
  markApplicationNeedsRevision,
  markUnderReview,
  claimApplication,
  reassignApplication,
  escalateApplication,
  listEligibleReviewTargets,
  listVendorAccounts,
  getVendorAccount,
  suspendVendor,
  reinstateVendor,
  banVendor,
  unbanVendor,
  approveDocument,
  rejectDocument,
} from "../services/admin.vendor.service"

//* Application

export const handleListApplications: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { status, countrySlug, search, sort, dir, page, pageSize } = req.query

    const result = await listApplications(
      {
        status     : status      as VendorApplicationStatus | undefined,
        countrySlug: countrySlug as string | undefined,
        search     : search      as string | undefined,
        sort       : sort        as string | undefined,
        dir        : dir         as string | undefined,
        page       : page        ? parseInt(page     as string) : undefined,
        pageSize   : pageSize    ? parseInt(pageSize as string) : undefined,
      },
      adminScope,
    )
    return sendSuccess(res, result, "Applications fetched")
  } catch (err) { next(err) }
}

export const handleGetApplication: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { id }         = req.params as { id: string }
    const application    = await getApplication(id, adminScope)
    return sendSuccess(res, application, "Application fetched")
  } catch (err) { next(err) }
}

export const handleApproveApplication: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope, adminPermissions } = req as unknown as AdminRequest
    const { id }                    = req.params as { id: string }
    const result = await approveApplication(id, adminUser.id, adminScope, adminPermissions)
    return sendSuccess(res, result, "Application approved")
  } catch (err) { next(err) }
}

export const handleRejectApplication: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope, adminPermissions } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }
    const { reasonCode, rejectionReason, revisionNotes } = req.body

    if (!reasonCode) throw new ApiError(400, "reasonCode is required", "MISSING_FIELDS")

    const result = await rejectApplication(
      id, reasonCode, rejectionReason, revisionNotes, adminUser.id, adminScope, adminPermissions,
    )
    return sendSuccess(res, result, "Application rejected")
  } catch (err) { next(err) }
}

//* Soft, resubmittable outcome — distinct from reject. Same request
//* shape as reject (a mandatory reason code + optional notes).
export const handleMarkApplicationNeedsRevision: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope, adminPermissions } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }
    const { reasonCode, rejectionReason, revisionNotes } = req.body

    if (!reasonCode) throw new ApiError(400, "reasonCode is required", "MISSING_FIELDS")

    const result = await markApplicationNeedsRevision(
      id, reasonCode, rejectionReason, revisionNotes, adminUser.id, adminScope, adminPermissions,
    )
    return sendSuccess(res, result, "Application marked as needing revision")
  } catch (err) { next(err) }
}

export const handleMarkUnderReview: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope, adminPermissions } = req as unknown as AdminRequest
    const { id }                    = req.params as { id: string }
    const result = await markUnderReview(id, adminUser.id, adminScope, adminPermissions)
    return sendSuccess(res, result, "Application marked under review")
  } catch (err) { next(err) }
}

//* Claim / reassign / escalate

export const handleClaimApplication: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope, adminPermissions } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }
    const result = await claimApplication(id, adminUser.id, adminScope, adminUser.reviewAvailability, adminPermissions)
    return sendSuccess(res, result, "Application claimed")
  } catch (err) { next(err) }
}

export const handleReassignApplication: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }
    const { targetAdminId, reason } = req.body as { targetAdminId?: string; reason?: string }

    if (!targetAdminId?.trim()) throw new ApiError(400, "targetAdminId is required", "MISSING_FIELDS")

    const result = await reassignApplication(id, targetAdminId, reason, adminUser.id, adminScope)
    return sendSuccess(res, result, "Application reassigned")
  } catch (err) { next(err) }
}

export const handleEscalateApplication: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope, adminPermissions } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }
    const { reason, targetAdminId } = req.body as { reason?: string; targetAdminId?: string }

    if (!reason?.trim()) throw new ApiError(400, "reason is required", "MISSING_FIELDS")

    const result = await escalateApplication(id, reason, adminUser.id, adminScope, adminPermissions, targetAdminId?.trim() || undefined)
    return sendSuccess(res, result, "Application escalated")
  } catch (err) { next(err) }
}

export const handleListEligibleReviewTargets: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }
    const { for: capabilityFor } = req.query as { for?: string }

    const capability = capabilityFor === "escalate"
      ? AdminPermissions.VENDORS_APPLICATIONS_RECEIVE_ESCALATION
      : AdminPermissions.VENDORS_APPLICATIONS_REVIEW

    const result = await listEligibleReviewTargets(id, adminScope, adminUser.id, capability)
    return sendSuccess(res, result, "Eligible reviewers fetched")
  } catch (err) { next(err) }
}

//* Vendor documents

export const handleApproveDocument: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }

    const result = await approveDocument(id, adminUser.id, adminScope)
    return sendSuccess(res, result, "Document approved")
  } catch (err) { next(err) }
}

export const handleRejectDocument: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }
    const { rejectionReason, revisionNotes } = req.body

    if (!rejectionReason) {
      throw new ApiError(400, "rejectionReason is required", "MISSING_FIELDS")
    }

    const result = await rejectDocument(
      id,
      rejectionReason,
      revisionNotes,
      adminUser.id,
      adminScope,
    )
    return sendSuccess(res, result, "Document rejected")
  } catch (err) { next(err) }
}

//* Vendor accounts

export const handleListVendorAccounts: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope }  = req as unknown as AdminRequest
    const { status, countrySlug, search, vendorTypeId, bannedOnly, sort, dir, page, pageSize } = req.query

    const result = await listVendorAccounts(
      {
        status      : status       as VendorStatus | undefined,
        countrySlug : countrySlug  as string | undefined,
        search      : search       as string | undefined,
        vendorTypeId: vendorTypeId as string | undefined,
        bannedOnly  : bannedOnly === "true",
        sort        : sort         as string | undefined,
        dir         : dir          as string | undefined,
        page        : page         ? parseInt(page     as string) : undefined,
        pageSize    : pageSize     ? parseInt(pageSize as string) : undefined,
      },
      adminScope,
    )
    return sendSuccess(res, result, "Vendor accounts fetched")
  } catch (err) { next(err) }
}

export const handleGetVendorAccount: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { id }         = req.params as { id: string }
    const account        = await getVendorAccount(id, adminScope)
    return sendSuccess(res, account, "Vendor account fetched")
  } catch (err) { next(err) }
}

export const handleSuspendVendor: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { id }                    = req.params as { id: string }
    const { reason }                = req.body
    if (!reason) throw new ApiError(400, "reason is required", "MISSING_FIELDS")
    const result = await suspendVendor(id, reason, adminUser.id, adminScope)
    return sendSuccess(res, result, "Vendor suspended")
  } catch (err) { next(err) }
}

export const handleReinstateVendor: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { id }                    = req.params as { id: string }
    const result = await reinstateVendor(id, adminUser.id, adminScope)
    return sendSuccess(res, result, "Vendor reinstated")
  } catch (err) { next(err) }
}

export const handleBanVendor: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { id }                    = req.params as { id: string }
    const { reason }                = req.body
    if (!reason) throw new ApiError(400, "reason is required", "MISSING_FIELDS")
    const result = await banVendor(id, reason, adminUser.id, adminScope)
    return sendSuccess(res, result, "Vendor banned")
  } catch (err) { next(err) }
}

export const handleUnbanVendor: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { id }                    = req.params as { id: string }
    const result = await unbanVendor(id, adminUser.id, adminScope)
    return sendSuccess(res, result, "Vendor unbanned")
  } catch (err) { next(err) }
}