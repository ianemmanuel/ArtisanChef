import type { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { ApiError } from "@/middleware/error"
import {
  listVendorTypes,
  getVendorType,
  createVendorType,
  updateVendorType,
  activateVendorType,
  deactivateVendorType,
  listVendorTypesForCountry,
  assignVendorTypeToCountry,
  removeVendorTypeFromCountry,
  getVendorTypeStats,
  getVendorTypeAdoption,
} from "../services/admin.vendorType.service"
import type { VendorTypeStatus } from "@repo/db"

export const handleListVendorTypes: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { page, pageSize, search, status, countryId } = req.query

    const data = await listVendorTypes(adminScope, {
      page     : page     ? parseInt(page as string) : undefined,
      pageSize : pageSize ? parseInt(pageSize as string) : undefined,
      search   : search   as string | undefined,
      status   : status   as VendorTypeStatus | undefined,
      countryId: countryId as string | undefined,
    })
    return sendSuccess(res, data, "Vendor types fetched")
  } catch (err) { next(err) }
}

export const handleGetVendorTypeAdoption: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { countryId, limit } = req.query
    const data = await getVendorTypeAdoption(adminScope, {
      countryId: countryId as string | undefined,
      limit    : limit ? parseInt(limit as string) : undefined,
    })
    return sendSuccess(res, data, "Vendor type adoption fetched")
  } catch (err) { next(err) }
}

export const handleGetVendorTypeStats: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { vendorTypeId } = req.params as { vendorTypeId: string }
    const data = await getVendorTypeStats(vendorTypeId, adminScope)
    return sendSuccess(res, data, "Vendor type stats fetched")
  } catch (err) { next(err) }
}

export const handleGetVendorType: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { vendorTypeId } = req.params as { vendorTypeId: string }
    const data = await getVendorType(vendorTypeId, adminScope)
    return sendSuccess(res, data, "Vendor type fetched")
  } catch (err) { next(err) }
}

export const handleCreateVendorType: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { name, description } = req.body as { name?: string; description?: string }

    if (!name?.trim()) throw new ApiError(400, "name is required", "MISSING_FIELDS")

    const data = await createVendorType({ name: name.trim(), description }, adminUser.id, adminScope)
    return sendSuccess(res, data, "Vendor type created", 201)
  } catch (err) { next(err) }
}

export const handleUpdateVendorType: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { vendorTypeId } = req.params as { vendorTypeId: string }
    const { name, description } = req.body as { name?: string; description?: string }

    const data = await updateVendorType(vendorTypeId, { name, description }, adminUser.id, adminScope)
    return sendSuccess(res, data, "Vendor type updated")
  } catch (err) { next(err) }
}

export const handleActivateVendorType: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { vendorTypeId } = req.params as { vendorTypeId: string }
    const data = await activateVendorType(vendorTypeId, adminUser.id, adminScope)
    return sendSuccess(res, data, "Vendor type activated")
  } catch (err) { next(err) }
}

export const handleDeactivateVendorType: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { vendorTypeId } = req.params as { vendorTypeId: string }
    const data = await deactivateVendorType(vendorTypeId, adminUser.id, adminScope)
    return sendSuccess(res, data, "Vendor type deactivated")
  } catch (err) { next(err) }
}

//* ─── Country associations ───────────────────────────────────────────────

export const handleListVendorTypesForCountry: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { countryRef } = req.params as { countryRef: string }
    const data = await listVendorTypesForCountry(countryRef, adminScope)
    return sendSuccess(res, data, "Country vendor types fetched")
  } catch (err) { next(err) }
}

export const handleAssignVendorTypeToCountry: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { countryRef } = req.params as { countryRef: string }
    const { vendorTypeId } = req.body as { vendorTypeId?: string }

    if (!vendorTypeId?.trim()) throw new ApiError(400, "vendorTypeId is required", "MISSING_FIELDS")

    const data = await assignVendorTypeToCountry(vendorTypeId, countryRef, adminUser.id, adminScope)
    return sendSuccess(res, data, "Vendor type assigned to country", 201)
  } catch (err) { next(err) }
}

export const handleRemoveVendorTypeFromCountry: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { countryRef, vendorTypeId } = req.params as { countryRef: string; vendorTypeId: string }

    const data = await removeVendorTypeFromCountry(vendorTypeId, countryRef, adminUser.id, adminScope)
    return sendSuccess(res, data, "Vendor type removed from country")
  } catch (err) { next(err) }
}
