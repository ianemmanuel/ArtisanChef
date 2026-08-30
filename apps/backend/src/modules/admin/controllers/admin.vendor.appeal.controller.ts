import { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import type { AppealSubjectType, AppealStatus } from "@repo/db"
import { AdminPermissions } from "@repo/types/enums"
import { sendSuccess } from "@/helpers/api-response/response"
import { ApiError } from "@/errors/ApiError"
import {
  logAppeal, listAppeals, exportAppealsCsv, getAppeal,
  claimAppeal, escalateAppeal, reassignAppeal, listEligibleAppealTargets, resolveAppeal,
} from "../services/admin.vendor.appeal.service"

export const handleLogAppeal: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { subjectType, applicationId, vendorId, reason } = req.body as {
      subjectType?: AppealSubjectType; applicationId?: string; vendorId?: string; reason?: string
    }
    if (!subjectType) throw new ApiError(400, "subjectType is required", "MISSING_FIELDS")
    if (!reason?.trim()) throw new ApiError(400, "reason is required", "MISSING_FIELDS")

    const appeal = await logAppeal({ subjectType, applicationId, vendorId, reason }, adminUser.id, adminScope)
    return sendSuccess(res, appeal, "Appeal logged", 201)
  } catch (err) { next(err) }
}

export const handleListAppeals: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { status, subjectType, countrySlug, search, queue, page, pageSize } = req.query

    const result = await listAppeals(adminScope, {
      status     : status      as AppealStatus | undefined,
      subjectType: subjectType as AppealSubjectType | undefined,
      countrySlug: countrySlug as string | undefined,
      search     : search      as string | undefined,
      queue      : queue       as "mine" | "unclaimed" | "escalated" | "escalated_unclaimed" | undefined,
      page       : page     ? parseInt(page     as string) : undefined,
      pageSize   : pageSize ? parseInt(pageSize as string) : undefined,
    }, adminUser.id)
    return sendSuccess(res, result, "Appeals fetched")
  } catch (err) { next(err) }
}

export const handleExportAppealsCsv: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { status, subjectType, countrySlug, search } = req.query

    const csv = await exportAppealsCsv(adminScope, {
      status     : status      as AppealStatus | undefined,
      subjectType: subjectType as AppealSubjectType | undefined,
      countrySlug: countrySlug as string | undefined,
      search     : search      as string | undefined,
    })
    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader("Content-Disposition", `attachment; filename="vendor-appeals-${new Date().toISOString().slice(0, 10)}.csv"`)
    return res.status(200).send(csv)
  } catch (err) { next(err) }
}

export const handleGetAppeal: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }

    const appeal = await getAppeal(id, adminScope)
    return sendSuccess(res, appeal, "Appeal fetched")
  } catch (err) { next(err) }
}

export const handleClaimAppeal: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope, adminPermissions } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }
    const appeal = await claimAppeal(id, adminUser.id, adminScope, adminPermissions)
    return sendSuccess(res, appeal, "Appeal claimed")
  } catch (err) { next(err) }
}

export const handleEscalateAppeal: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope, adminPermissions } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }
    const { reason } = req.body as { reason?: string }
    if (!reason?.trim()) throw new ApiError(400, "reason is required", "MISSING_FIELDS")
    const appeal = await escalateAppeal(id, reason, adminUser.id, adminScope, adminPermissions)
    return sendSuccess(res, appeal, "Appeal escalated")
  } catch (err) { next(err) }
}

export const handleReassignAppeal: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }
    const { targetAdminId, reason } = req.body as { targetAdminId?: string; reason?: string }
    if (!targetAdminId) throw new ApiError(400, "targetAdminId is required", "MISSING_FIELDS")
    const appeal = await reassignAppeal(id, targetAdminId, reason, adminUser.id, adminScope)
    return sendSuccess(res, appeal, "Appeal reassigned")
  } catch (err) { next(err) }
}

export const handleListEligibleAppealTargets: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { appealId, for: forAction } = req.query as { appealId?: string; for?: string }
    if (!appealId) throw new ApiError(400, "appealId is required", "MISSING_FIELDS")
    const capability = forAction === "escalate" ? AdminPermissions.VENDORS_APPEALS_RECEIVE_ESCALATION : AdminPermissions.VENDORS_APPEALS_CLAIM
    const targets = await listEligibleAppealTargets(appealId, adminScope, capability)
    return sendSuccess(res, targets, "Eligible targets fetched")
  } catch (err) { next(err) }
}

export const handleResolveAppeal: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }
    const { outcome, resolutionNote } = req.body as { outcome?: "UPHELD" | "OVERTURNED"; resolutionNote?: string }
    if (outcome !== "UPHELD" && outcome !== "OVERTURNED") {
      throw new ApiError(400, "outcome must be UPHELD or OVERTURNED", "INVALID_OUTCOME")
    }

    const appeal = await resolveAppeal(id, outcome, resolutionNote, adminUser.id, adminScope)
    return sendSuccess(res, appeal, "Appeal resolved")
  } catch (err) { next(err) }
}
