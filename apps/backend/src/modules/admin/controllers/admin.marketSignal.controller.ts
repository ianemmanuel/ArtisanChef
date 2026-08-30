import { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { ApiError } from "@/middleware/error"
import {
  getCityMarketSignalSummary,
  listCityMarketSignals,
  recordMarketSignal,
  updateMarketSignalStatus,
} from "../services/admin.marketSignal.service"

export const handleGetMarketSignalSummary: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { cityRef } = req.params as { cityRef: string }
    const data = await getCityMarketSignalSummary(cityRef, adminScope)
    return sendSuccess(res, data, "Market signal summary fetched")
  } catch (err) { next(err) }
}

export const handleListMarketSignals: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { cityRef } = req.params as { cityRef: string }
    const { type, status, zoneId, page, pageSize } = req.query as Record<string, string | undefined>
    const data = await listCityMarketSignals(
      cityRef,
      {
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
        ...(zoneId ? { zoneId } : {}),
        ...(page ? { page: Number(page) } : {}),
        ...(pageSize ? { pageSize: Number(pageSize) } : {}),
      },
      adminScope,
    )
    return sendSuccess(res, data, "Market signals fetched")
  } catch (err) { next(err) }
}

export const handleRecordMarketSignal: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { cityRef } = req.params as { cityRef: string }
    const { type, latitude, longitude, contactName, contactEmail, contactPhone, note } = req.body

    if (!type || latitude == null || longitude == null) {
      throw new ApiError(400, "type, latitude, and longitude are required", "MISSING_FIELDS")
    }

    const data = await recordMarketSignal(
      cityRef,
      { type, latitude: Number(latitude), longitude: Number(longitude), contactName, contactEmail, contactPhone, note },
      adminUser.id,
      adminScope,
    )
    return sendSuccess(res, data, "Market signal logged", 201)
  } catch (err) { next(err) }
}

export const handleUpdateMarketSignalStatus: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { signalId } = req.params as { signalId: string }
    const { status } = req.body

    if (!status) throw new ApiError(400, "status is required", "MISSING_FIELDS")

    const data = await updateMarketSignalStatus(signalId, status, adminUser.id, adminScope)
    return sendSuccess(res, data, "Market signal updated")
  } catch (err) { next(err) }
}
