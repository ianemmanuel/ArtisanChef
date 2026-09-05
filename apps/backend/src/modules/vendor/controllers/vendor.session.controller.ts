import { RequestHandler } from "express"
import type { VendorRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { buildVendorSessionResponse } from "../services/vendor.session.service"
import { getVendorGoLiveStatus } from "../services/vendor.profile.service"

/*
 * GET /api/vendors/v1/auth/session
 * Returns the vendor's current lifecycle state. Lifecycle data is already
 * loaded by vendorAuthChain (zero DB); for an ACTIVE vendor we additionally
 * attach the authoritative selling-readiness result so the dashboard can
 * render it without a second round-trip — same "one extra awaited call in
 * the controller, kept out of the pure session transform" pattern the admin
 * module uses for hasOpenComplianceIssues.
 */
export const getVendorSession: RequestHandler = async (req, res, next) => {
  try {
    const { vendor } = req as unknown as VendorRequest
    const session = buildVendorSessionResponse(vendor)

    if (vendor.state === "ACTIVE" && vendor.account) {
      session.goLiveStatus = await getVendorGoLiveStatus(vendor.account.id)
    }

    return sendSuccess(res, session, "Session fetched")
  } catch (err) { next(err) }
}
