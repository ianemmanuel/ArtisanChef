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
  handleUnbanVendor,
  handleApproveDocument,
  handleRejectDocument,
} from "../../controllers/admin.vendor.controller"
import { handleGetDocumentSignedUrl } from "../../controllers/admin.document.controller"
import { handleVerifyPayoutAccount, handleRejectPayoutAccount } from "../../controllers/admin.vendor.payout.controller"
import { handleUpdateVendorCommissionRate, handleGetVendorCommissionRateHistory } from "../../controllers/admin.vendor.commission.controller"
import {
  handleGetExpiringDocuments,
  handleGetExpiredDocuments,
  handleGetComplianceOverview,
  handleExportComplianceIssuesCsv,
  handleCreateComplianceWaiver,
  handleRevokeComplianceWaiver,
  handleClaimComplianceCase,
  handleEscalateComplianceCase,
  handleReassignComplianceCase,
  handleListEligibleComplianceTargets,
  handleNotifyVendorAboutComplianceIssue,
} from "../../controllers/admin.vendor.compliance.controller"
import {
  handleLogAppeal,
  handleListAppeals,
  handleGetAppeal,
  handleAssignAppeal,
  handleResolveAppeal,
} from "../../controllers/admin.vendor.appeal.controller"


 
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
vendorRouter.post("/accounts/:id/unban", requirePermission(AdminPermissions.VENDORS_ACCOUNTS_BAN), handleUnbanVendor)

// Payout account verification — Roadmap Phase 1 (CLAUDE.md): the manual
// path that lets a vendor's payout account ever actually reach VERIFIED.
vendorRouter.post("/accounts/:id/payout-accounts/:accountId/verify", requirePermission(AdminPermissions.VENDORS_PAYOUT_ACCOUNTS_MANAGE), handleVerifyPayoutAccount)
vendorRouter.post("/accounts/:id/payout-accounts/:accountId/reject", requirePermission(AdminPermissions.VENDORS_PAYOUT_ACCOUNTS_MANAGE), handleRejectPayoutAccount)

// Commission rate — Roadmap Phase 2 (CLAUDE.md): always writes a
// VendorCommissionRateHistory row alongside the live value.
vendorRouter.patch("/accounts/:id/commission-rate", requirePermission(AdminPermissions.VENDORS_ACCOUNTS_COMMISSION_MANAGE), handleUpdateVendorCommissionRate)
vendorRouter.get("/accounts/:id/commission-rate/history", requirePermission(AdminPermissions.VENDORS_ACCOUNTS_COMMISSION_MANAGE), handleGetVendorCommissionRateHistory)

//DOCUMENTS
vendorRouter.get("/documents/:id/signed-url", requirePermission(AdminPermissions.VENDORS_DOCUMENTS_VIEW), handleGetDocumentSignedUrl)
vendorRouter.post("/documents/:id/approve", requirePermission(AdminPermissions.VENDORS_DOCUMENTS_VIEW), handleApproveDocument)
vendorRouter.post("/documents/:id/reject", requirePermission(AdminPermissions.VENDORS_DOCUMENTS_VIEW), handleRejectDocument)

// Compliance — cross-vendor expiry/missing-document visibility. Its own
// dedicated read permission (VENDORS_COMPLIANCE_READ) — viewing the
// compliance queue is gated separately from viewing the vendor directory
// in general, so an admin who can read accounts but wasn't given
// compliance visibility genuinely can't reach any of this.
vendorRouter.get("/compliance/expiring", requirePermission(AdminPermissions.VENDORS_COMPLIANCE_READ), handleGetExpiringDocuments)
vendorRouter.get("/compliance/expired", requirePermission(AdminPermissions.VENDORS_COMPLIANCE_READ), handleGetExpiredDocuments)
// Unified, filterable, paginated list behind /vendors/compliance — see
// getComplianceOverview for why this is a separate query rather than a
// wrapper around the two above.
vendorRouter.get("/compliance/overview", requirePermission(AdminPermissions.VENDORS_COMPLIANCE_READ), handleGetComplianceOverview)
// Roadmap VM-P2-01 (CLAUDE.md) — CSV export, same filters + permission as the overview.
vendorRouter.get("/compliance/export", requirePermission(AdminPermissions.VENDORS_COMPLIANCE_READ), handleExportComplianceIssuesCsv)

// Claim/escalate — the case workflow, modeled closely on the applications
// review workflow above. Both require base READ too (same "review is the
// fundamental capability" pattern as applications' REVIEW gate).
vendorRouter.post(
  "/compliance/cases/claim",
  requirePermission(AdminPermissions.VENDORS_COMPLIANCE_READ),
  requirePermission(AdminPermissions.VENDORS_COMPLIANCE_CLAIM),
  handleClaimComplianceCase,
)
vendorRouter.post(
  "/compliance/cases/escalate",
  requirePermission(AdminPermissions.VENDORS_COMPLIANCE_READ),
  requirePermission(AdminPermissions.VENDORS_COMPLIANCE_ESCALATE),
  handleEscalateComplianceCase,
)
vendorRouter.post(
  "/compliance/cases/reassign",
  requirePermission(AdminPermissions.VENDORS_COMPLIANCE_READ),
  requirePermission(AdminPermissions.VENDORS_COMPLIANCE_REASSIGN),
  handleReassignComplianceCase,
)
vendorRouter.get(
  "/compliance/cases/eligible-targets",
  requirePermission(AdminPermissions.VENDORS_COMPLIANCE_READ),
  handleListEligibleComplianceTargets,
)

// Waivers + notify — the phase-3 "act on a compliance issue" capabilities.
// Their own permission (VENDORS_ACCOUNTS_COMPLIANCE_MANAGE), not folded
// into ACCOUNTS_SUSPEND — granting a waiver or notifying a vendor is its
// own auditable judgment call.
vendorRouter.post("/compliance/waivers", requirePermission(AdminPermissions.VENDORS_ACCOUNTS_COMPLIANCE_MANAGE), handleCreateComplianceWaiver)
vendorRouter.post("/compliance/waivers/:waiverId/revoke", requirePermission(AdminPermissions.VENDORS_ACCOUNTS_COMPLIANCE_MANAGE), handleRevokeComplianceWaiver)
vendorRouter.post("/compliance/notify", requirePermission(AdminPermissions.VENDORS_ACCOUNTS_COMPLIANCE_MANAGE), handleNotifyVendorAboutComplianceIssue)

// Appeals — Roadmap VM-P1-04 (CLAUDE.md). Admin-side log/track/resolve of
// a formal appeal against a rejected application, suspension, or ban.
// Deliberately simpler than compliance/applications: no claim-race lock,
// no escalation pool — just READ (view) and MANAGE (log/assign/resolve).
vendorRouter.get("/appeals", requirePermission(AdminPermissions.VENDORS_APPEALS_READ), handleListAppeals)
vendorRouter.get("/appeals/:id", requirePermission(AdminPermissions.VENDORS_APPEALS_READ), handleGetAppeal)
vendorRouter.post("/appeals", requirePermission(AdminPermissions.VENDORS_APPEALS_MANAGE), handleLogAppeal)
vendorRouter.patch("/appeals/:id/assign", requirePermission(AdminPermissions.VENDORS_APPEALS_MANAGE), handleAssignAppeal)
vendorRouter.patch("/appeals/:id/resolve", requirePermission(AdminPermissions.VENDORS_APPEALS_MANAGE), handleResolveAppeal)

export default vendorRouter