import type { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import type { ProfileReviewStatus } from "@repo/db"
import { sendSuccess } from "@/helpers/api-response/response"
import { ApiError } from "@/middleware/error"
import {
  listVendorProfiles,
  exportVendorProfilesCsv,
  getVendorProfileForAdmin,
  approveVendorProfile,
  rejectVendorProfile,
} from "../services/admin.vendorProfile.service"

export const handleListVendorProfiles: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { status, country, search, page, pageSize } = req.query as Record<string, string>

    const data = await listVendorProfiles(adminScope, {
      status     : status as ProfileReviewStatus | undefined,
      countrySlug: country,
      search,
      page    : page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
    return sendSuccess(res, data, "Vendor profiles fetched")
  } catch (err) { next(err) }
}

export const handleExportVendorProfilesCsv: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { status, country, search } = req.query as Record<string, string>

    const csv = await exportVendorProfilesCsv(adminScope, {
      status     : status as ProfileReviewStatus | undefined,
      countrySlug: country,
      search,
    })
    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader("Content-Disposition", `attachment; filename="vendor-profiles-${new Date().toISOString().slice(0, 10)}.csv"`)
    return res.status(200).send(csv)
  } catch (err) { next(err) }
}

export const handleGetVendorProfileForAdmin: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { vendorId } = req.params as { vendorId: string }
    const data = await getVendorProfileForAdmin(vendorId, adminScope)
    return sendSuccess(res, data, "Vendor profile fetched")
  } catch (err) { next(err) }
}

export const handleApproveVendorProfile: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { vendorId } = req.params as { vendorId: string }
    const data = await approveVendorProfile(vendorId, adminUser.id, adminScope)
    return sendSuccess(res, data, "Profile approved")
  } catch (err) { next(err) }
}

export const handleRejectVendorProfile: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { vendorId } = req.params as { vendorId: string }
    const { reason } = req.body as { reason?: string }
    if (!reason?.trim()) throw new ApiError(400, "reason is required", "MISSING_FIELDS")

    const data = await rejectVendorProfile(vendorId, reason, adminUser.id, adminScope)
    return sendSuccess(res, data, "Profile rejected")
  } catch (err) { next(err) }
}
