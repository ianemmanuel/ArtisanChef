import type { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { ApiError } from "@/errors/ApiError"
import { listOutletsForFinance, listCitiesForFinance } from "../services/admin.finance.service"

export const handleListOutletsForFinance: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { country, city, page, pageSize } = req.query as Record<string, string>

    const data = await listOutletsForFinance(adminScope, {
      countrySlug: country,
      cityId     : city,
      page       : page     ? Number(page)     : undefined,
      pageSize   : pageSize ? Number(pageSize) : undefined,
    })
    return sendSuccess(res, data, "Outlets fetched")
  } catch (err) { next(err) }
}

export const handleListCitiesForFinance: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { country } = req.query as Record<string, string>
    if (!country?.trim()) throw new ApiError(400, "country is required", "MISSING_FIELDS")

    const data = await listCitiesForFinance(adminScope, country)
    return sendSuccess(res, data, "Cities fetched")
  } catch (err) { next(err) }
}
