import { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { ApiError } from "@/errors/ApiError"
import { verifyPayoutAccount, rejectPayoutAccount, placePayoutHold, releasePayoutHold } from "../services/admin.vendor.payout.service"

export const handleVerifyPayoutAccount: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { id: vendorId, accountId } = req.params as { id: string; accountId: string }

    const account = await verifyPayoutAccount(vendorId, accountId, adminUser.id, adminScope)
    return sendSuccess(res, account, "Payout account verified")
  } catch (err) { next(err) }
}

export const handleRejectPayoutAccount: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { id: vendorId, accountId } = req.params as { id: string; accountId: string }
    const { reason } = req.body as { reason?: string }

    if (!reason?.trim()) throw new ApiError(400, "reason is required", "MISSING_FIELDS")

    const account = await rejectPayoutAccount(vendorId, accountId, reason, adminUser.id, adminScope)
    return sendSuccess(res, account, "Payout account rejected")
  } catch (err) { next(err) }
}

export const handlePlacePayoutHold: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { id: vendorId } = req.params as { id: string }
    const { reason } = req.body as { reason?: string }

    if (!reason?.trim()) throw new ApiError(400, "reason is required", "MISSING_FIELDS")

    const result = await placePayoutHold(vendorId, reason, adminUser.id, adminScope)
    return sendSuccess(res, result, "Payout hold placed")
  } catch (err) { next(err) }
}

export const handleReleasePayoutHold: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { id: vendorId } = req.params as { id: string }

    const result = await releasePayoutHold(vendorId, adminUser.id, adminScope)
    return sendSuccess(res, result, "Payout hold released")
  } catch (err) { next(err) }
}
