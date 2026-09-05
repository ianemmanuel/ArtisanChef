import type { VendorContext, VendorSessionData } from "@repo/types/backend"

/**
 * Pure transform — no DB call. Everything here was already loaded by
 * loadVendorContext and lives on req.vendor by the time this runs.
 * Mirrors buildAdminSession() in the admin module exactly.
 *
 * `goLiveStatus` is left null here on purpose — it needs a DB call
 * (getVendorGoLiveStatus) and so is attached by the controller, the same
 * way admin.session.controller.ts attaches hasOpenComplianceIssues outside
 * its pure buildAdminSession transform.
 */
export function buildVendorSessionResponse(vendor: VendorContext): VendorSessionData {
  return {
    state        : vendor.state,
    vendorUser   : vendor.user,
    application  : vendor.application,
    vendorAccount: vendor.account,
    goLiveStatus : null,
  }
}