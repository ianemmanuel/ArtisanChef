import { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { ApiError } from "@/errors/ApiError"
import { updateVendorCommissionRate, getVendorCommissionRateHistory } from "../services/admin.vendor.commission.service"

export const handleUpdateVendorCommissionRate: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }
    const { newRate, reason } = req.body as { newRate?: number; reason?: string }

    if (typeof newRate !== "number") throw new ApiError(400, "newRate is required", "MISSING_FIELDS")

    const data = await updateVendorCommissionRate(id, newRate, reason, adminUser.id, adminScope)
    return sendSuccess(res, data, "Commission rate updated")
  } catch (err) { next(err) }
}

export const handleGetVendorCommissionRateHistory: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }

    const data = await getVendorCommissionRateHistory(id, adminScope)
    return sendSuccess(res, data, "Commission rate history fetched")
  } catch (err) { next(err) }
}
