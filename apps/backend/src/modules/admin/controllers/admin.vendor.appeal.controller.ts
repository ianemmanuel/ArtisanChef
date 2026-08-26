import { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import type { AppealSubjectType, AppealStatus } from "@repo/db"
import { sendSuccess } from "@/helpers/api-response/response"
import { ApiError } from "@/errors/ApiError"
import { logAppeal, listAppeals, getAppeal, assignAppeal, resolveAppeal } from "../services/admin.vendor.appeal.service"

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
    const { adminScope } = req as unknown as AdminRequest
    const { status, subjectType, countrySlug, search, page, pageSize } = req.query

    const result = await listAppeals(adminScope, {
      status     : status      as AppealStatus | undefined,
      subjectType: subjectType as AppealSubjectType | undefined,
      countrySlug: countrySlug as string | undefined,
      search     : search      as string | undefined,
      page       : page     ? parseInt(page     as string) : undefined,
      pageSize   : pageSize ? parseInt(pageSize as string) : undefined,
    })
    return sendSuccess(res, result, "Appeals fetched")
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

export const handleAssignAppeal: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }
    const { reviewerId } = req.body as { reviewerId?: string | null }

    const appeal = await assignAppeal(id, reviewerId ?? null, adminUser.id, adminScope)
    return sendSuccess(res, appeal, reviewerId ? "Appeal assigned" : "Appeal unassigned")
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
