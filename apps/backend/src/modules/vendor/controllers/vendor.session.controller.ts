import { RequestHandler } from "express"
import type { VendorRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { buildVendorSessionResponse } from "../services/vendor.session.service"

/*
 * GET /api/vendors/v1/auth/session
 * Returns the vendor's current lifecycle state. All data already
 * loaded by vendorAuthChain — zero additional DB calls.
 */
export const getVendorSession: RequestHandler = (req, res, next) => {
  try {
    const { vendor } = req as unknown as VendorRequest
    const session = buildVendorSessionResponse(vendor)
    return sendSuccess(res, session, "Session fetched")
  } catch (err) { next(err) }
}