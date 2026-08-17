import { VendorApplicationStatus } from "@repo/db"
import { ApiError } from "@/errors/ApiError"

/*
  * The only two states a vendor is allowed to write into. Everything
  * past SUBMITTED is either an admin-owned business record or a
  * terminal state — never editable directly by the vendor again.
*/

export const EDITABLE_APPLICATION_STATUSES: VendorApplicationStatus[] = [
  VendorApplicationStatus.DRAFT,
  VendorApplicationStatus.NEEDS_REVISION,
]

export function ensureApplicationEditable(status: VendorApplicationStatus) {
  if (!EDITABLE_APPLICATION_STATUSES.includes(status)) {
    throw new ApiError(
      403,
      "This application cannot be edited at its current stage",
      "APPLICATION_NOT_EDITABLE"
    )
  }
}

/*
 * Country/vendor type changes are destructive (they invalidate every
 * uploaded document) and, deliberately, a stricter gate than ordinary
 * field edits: only allowed pre-review (DRAFT). A vendor mid-revision
 * changing their fundamental country/vendor-type would invalidate
 * everything a reviewer already looked at — treated as a support/admin
 * action, not vendor self-service.
 */
export function ensureScopeChangeAllowed(status: VendorApplicationStatus) {
  if (status !== VendorApplicationStatus.DRAFT) {
    throw new ApiError(
      403,
      "Country and vendor type can only be changed while your application is in draft. Contact support if you need to change these after a review.",
      "SCOPE_CHANGE_NOT_ALLOWED",
    )
  }
}