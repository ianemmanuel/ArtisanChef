import type { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import type { OutletReviewStatus, OutletAdminStatus } from "@repo/db"
import { sendSuccess } from "@/helpers/api-response/response"
import { ApiError } from "@/middleware/error"
import {
  listOutlets,
  exportOutletsCsv,
  getOutletForAdmin,
  approveOutlet,
  rejectOutlet,
  suspendOutlet,
  reinstateOutlet,
  banOutlet,
  unbanOutlet,
} from "../services/admin.outlet.service"

export const handleListOutlets: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { reviewStatus, adminStatus, country, search, vendor, page, pageSize } = req.query as Record<string, string>

    const data = await listOutlets(adminScope, {
      reviewStatus: reviewStatus as OutletReviewStatus | undefined,
      adminStatus : adminStatus as OutletAdminStatus | undefined,
      countrySlug : country,
      search,
      vendorId: vendor,
      page    : page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
    return sendSuccess(res, data, "Outlets fetched")
  } catch (err) { next(err) }
}

export const handleExportOutletsCsv: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { reviewStatus, adminStatus, country, search, vendor } = req.query as Record<string, string>

    const csv = await exportOutletsCsv(adminScope, {
      reviewStatus: reviewStatus as OutletReviewStatus | undefined,
      adminStatus : adminStatus as OutletAdminStatus | undefined,
      countrySlug : country,
      search,
      vendorId: vendor,
    })
    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader("Content-Disposition", `attachment; filename="vendor-outlets-${new Date().toISOString().slice(0, 10)}.csv"`)
    return res.status(200).send(csv)
  } catch (err) { next(err) }
}

export const handleGetOutletForAdmin: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { outletId } = req.params as { outletId: string }
    const data = await getOutletForAdmin(outletId, adminScope)
    return sendSuccess(res, data, "Outlet fetched")
  } catch (err) { next(err) }
}

export const handleApproveOutlet: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { outletId } = req.params as { outletId: string }
    const data = await approveOutlet(outletId, adminUser.id, adminScope)
    return sendSuccess(res, data, "Outlet approved")
  } catch (err) { next(err) }
}

export const handleRejectOutlet: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { outletId } = req.params as { outletId: string }
    const { reason } = req.body as { reason?: string }
    if (!reason?.trim()) throw new ApiError(400, "reason is required", "MISSING_FIELDS")
    const data = await rejectOutlet(outletId, reason, adminUser.id, adminScope)
    return sendSuccess(res, data, "Outlet rejected")
  } catch (err) { next(err) }
}

export const handleSuspendOutlet: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { outletId } = req.params as { outletId: string }
    const { reason, suspendUntil } = req.body as { reason?: string; suspendUntil?: string }
    if (!reason?.trim()) throw new ApiError(400, "reason is required", "MISSING_FIELDS")
    const data = await suspendOutlet(outletId, reason, adminUser.id, adminScope, suspendUntil ? new Date(suspendUntil) : undefined)
    return sendSuccess(res, data, "Outlet suspended")
  } catch (err) { next(err) }
}

export const handleReinstateOutlet: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { outletId } = req.params as { outletId: string }
    const data = await reinstateOutlet(outletId, adminUser.id, adminScope)
    return sendSuccess(res, data, "Outlet reinstated")
  } catch (err) { next(err) }
}

export const handleBanOutlet: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { outletId } = req.params as { outletId: string }
    const { reason } = req.body as { reason?: string }
    if (!reason?.trim()) throw new ApiError(400, "reason is required", "MISSING_FIELDS")
    const data = await banOutlet(outletId, reason, adminUser.id, adminScope)
    return sendSuccess(res, data, "Outlet banned")
  } catch (err) { next(err) }
}

export const handleUnbanOutlet: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { outletId } = req.params as { outletId: string }
    const data = await unbanOutlet(outletId, adminUser.id, adminScope)
    return sendSuccess(res, data, "Outlet unbanned")
  } catch (err) { next(err) }
}
