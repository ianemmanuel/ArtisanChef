
import { RequestHandler }  from "express"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { 
    activateCountry,
    assignCountryToRegion,
    deactivateCountry, 
    getCountriesByStatus,
    getCountry,
    getCountryVendorSnapshot,
    getVendorOnboardingLeaderboard,
    getCityOutletLeaderboard,
    listCitiesForCountry,
    listCountriesForScope,
    removeCountryFromRegion
} from "../services/admin.country.service"
import { ApiError } from "@/middleware/error"

export const handleListCountries: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const data = await listCountriesForScope(adminScope.countryIds, adminScope.isGlobal)
    return sendSuccess(res, data, "Countries fetched")
  } catch (err) { next(err) }
}

export const handleGetCountry: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { countryRef } = req.params as { countryRef: string }   // UUID or slug
    const data = await getCountry(countryRef, adminScope)
    return sendSuccess(res, data, "Country fetched")
  } catch (err) { next(err) }
}

export const handleActivateCountry: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { countryRef } = req.params as { countryRef: string }
    const data = await activateCountry(countryRef, adminUser.id, adminScope)
    return sendSuccess(res, data, "Country activated")
  } catch (err) { next(err) }
}

export const handleDeactivateCountry: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { countryRef }  = req.params as { countryRef: string }
    const data = await deactivateCountry(countryRef, adminUser.id, adminScope)
    return sendSuccess(res, data, "Country deactivated")
  } catch (err) { next(err) }
}

export const handleGetCountriesByStatus: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { status, page, pageSize, search } = req.query as {
      status?: string; page?: string; pageSize?: string; search?: string
    }

    if (status && status !== "ACTIVE" && status !== "INACTIVE") {
      throw new ApiError(400, "status must be 'ACTIVE' or 'INACTIVE'", "INVALID_STATUS")
    }

    const data = await getCountriesByStatus(
      adminScope,
      status as "ACTIVE" | "INACTIVE" | undefined,
      {
        page    : page     ? parseInt(page) : undefined,
        pageSize: pageSize  ? parseInt(pageSize) : undefined,
        search,
      },
    )
    return sendSuccess(res, data, "Countries fetched")
  } catch (err) { next(err) }
}

export const handleAssignCountryToRegion: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { countryRef } = req.params as { countryRef: string }
    const { regionId } = req.body as { regionId?: string }

    if (!regionId?.trim()) throw new ApiError(400, "regionId is required", "MISSING_FIELDS")

    await assignCountryToRegion(countryRef, regionId, adminUser.id, adminScope)

    return sendSuccess(res, null, "Country assigned to region")
  } catch (err) { next(err) }
}

export const handleRemoveCountryFromRegion: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope }  = req as unknown as AdminRequest
    const { countryRef } = req.params as { countryRef: string }

    await removeCountryFromRegion(countryRef, adminUser.id, adminScope)

    return sendSuccess(res, null, "Country removed from region")
  } catch (err) { next(err) }
}



export const handleListCities: RequestHandler = async (req, res, next) => {
    try {
        const { adminScope } = req as unknown as AdminRequest
        const { countryRef } = req.params as { countryRef: string }
        const { page, pageSize, status, search } = req.query as {
          page?: string; pageSize?: string; status?: string; search?: string
        }

        if (status && status !== "ACTIVE" && status !== "INACTIVE") {
          throw new ApiError(400, "status must be 'ACTIVE' or 'INACTIVE'", "INVALID_STATUS")
        }

        const data = await listCitiesForCountry(countryRef, adminScope, {
          page    : page ? Number(page) : undefined,
          pageSize: pageSize ? Number(pageSize) : undefined,
          status  : status as "ACTIVE" | "INACTIVE" | undefined,
          search,
        })
        return sendSuccess(res, data, "Cities fetched")
    } catch (err) { next(err) }
}

export const handleGetVendorOnboardingLeaderboard: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { quarter } = req.query as { quarter?: string }

    if (quarter && quarter !== "current" && quarter !== "previous") {
      throw new ApiError(400, "quarter must be 'current' or 'previous'", "INVALID_QUARTER")
    }

    const data = await getVendorOnboardingLeaderboard(adminScope, quarter as "current" | "previous" | undefined)
    return sendSuccess(res, data, "Onboarding leaderboard fetched")
  } catch (err) { next(err) }
}

export const handleGetCityOutletLeaderboard: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { countryRef } = req.params as { countryRef: string }
    const data = await getCityOutletLeaderboard(countryRef, adminScope)
    return sendSuccess(res, data, "City leaderboard fetched")
  } catch (err) { next(err) }
}

export const handleGetCountryVendorSnapshot: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    // Route param is :countryRef (see admin.country.routes.ts) — this used
    // to destructure a nonexistent `countrySlug`, so the snapshot call
    // always ran with `undefined` and 404'd before this fix.
    const { countryRef } = req.params as { countryRef: string }
    const snapshot = await getCountryVendorSnapshot(countryRef, adminScope)
    return sendSuccess(res, snapshot, "Vendor snapshot fetched")
  } catch (err) { next(err) }
}