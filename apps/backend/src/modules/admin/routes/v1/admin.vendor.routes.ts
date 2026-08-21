import { Router } from "express"
import { AdminPermissions } from "@repo/types/enums"
import { requirePermission } from "@/modules/admin/middleware"
import {
  handleListApplications,
  handleGetApplication,
  handleApproveApplication,
  handleRejectApplication,
  handleMarkApplicationNeedsRevision,
  handleMarkUnderReview,
  handleClaimApplication,
  handleReassignApplication,
  handleEscalateApplication,
  handleListEligibleReviewTargets,
  handleListVendorAccounts,
  handleGetVendorAccount,
  handleSuspendVendor,
  handleReinstateVendor,
  handleBanVendor,
  handleApproveDocument,
  handleRejectDocument,
} from "../../controllers/admin.vendor.controller"
import { handleGetDocumentSignedUrl } from "../../controllers/admin.document.controller"


 
const vendorRouter: Router = Router()

// Applications
vendorRouter.get("/applications", requirePermission(AdminPermissions.VENDORS_APPLICATIONS_READ ), handleListApplications)
vendorRouter.get("/applications/:id", requirePermission(AdminPermissions.VENDORS_APPLICATIONS_READ ), handleGetApplication)
vendorRouter.post("/applications/:id/review", requirePermission(AdminPermissions.VENDORS_APPLICATIONS_REVIEW ), handleMarkUnderReview)
// review = fundamental capability to participate in vendor application review.
// The specific-action permission (approve/reject/claim) stays as an additional
// gate on top — vendors_ops admins granted only e.g. discount/promo permissions
// via the individual AdminUserPermission mechanism must not be able to act here
// even though the vendor_ops role's pool includes these keys.
vendorRouter.post(
  "/applications/:id/approve",
  requirePermission(AdminPermissions.VENDORS_APPLICATIONS_REVIEW),
  requirePermission(AdminPermissions.VENDORS_APPLICATIONS_APPROVE),
  handleApproveApplication,
)
vendorRouter.post(
  "/applications/:id/reject",
  requirePermission(AdminPermissions.VENDORS_APPLICATIONS_REVIEW),
  requirePermission(AdminPermissions.VENDORS_APPLICATIONS_REJECT),
  handleRejectApplication,
)
vendorRouter.post("/applications/:id/needs-revision", requirePermission(AdminPermissions.VENDORS_APPLICATIONS_REVIEW), handleMarkApplicationNeedsRevision)
vendorRouter.post(
  "/applications/:id/claim",
  requirePermission(AdminPermissions.VENDORS_APPLICATIONS_REVIEW),
  requirePermission(AdminPermissions.VENDORS_APPLICATIONS_CLAIM),
  handleClaimApplication,
)
vendorRouter.post("/applications/:id/reassign", requirePermission(AdminPermissions.VENDORS_APPLICATIONS_REASSIGN), handleReassignApplication)
vendorRouter.post("/applications/:id/escalate", requirePermission(AdminPermissions.VENDORS_APPLICATIONS_ESCALATE), handleEscalateApplication)
// ?for=escalate returns admins with RECEIVE_ESCALATION instead of REVIEW —
// gated on the base REVIEW permission since both dialogs need this list
// and neither necessarily implies the other.
vendorRouter.get("/applications/:id/eligible-reviewers", requirePermission(AdminPermissions.VENDORS_APPLICATIONS_REVIEW), handleListEligibleReviewTargets)

// Accounts
vendorRouter.get("/accounts", requirePermission(AdminPermissions.VENDORS_ACCOUNTS_READ ), handleListVendorAccounts)
vendorRouter.get("/accounts/:id", requirePermission(AdminPermissions.VENDORS_ACCOUNTS_READ), handleGetVendorAccount)
vendorRouter.post("/accounts/:id/suspend", requirePermission(AdminPermissions.VENDORS_ACCOUNTS_SUSPEND), handleSuspendVendor)
vendorRouter.post("/accounts/:id/reinstate", requirePermission(AdminPermissions.VENDORS_ACCOUNTS_REINSTATE), handleReinstateVendor)
vendorRouter.post("/accounts/:id/ban", requirePermission(AdminPermissions.VENDORS_ACCOUNTS_BAN), handleBanVendor)

//DOCUMENTS
vendorRouter.get("/documents/:id/signed-url", requirePermission(AdminPermissions.VENDORS_DOCUMENTS_VIEW), handleGetDocumentSignedUrl)
vendorRouter.post("/documents/:id/approve", requirePermission(AdminPermissions.VENDORS_DOCUMENTS_VIEW), handleApproveDocument)
vendorRouter.post("/documents/:id/reject", requirePermission(AdminPermissions.VENDORS_DOCUMENTS_VIEW), handleRejectDocument)

export default vendorRouter