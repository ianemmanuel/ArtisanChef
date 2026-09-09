import { Router } from "express"
import { AdminPermissions } from "@repo/types/enums"
import { requirePermission } from "@/modules/admin/middleware"
import {
  handleListOutletsForFinance,
  handleListCitiesForFinance,
  handleListVendorPayoutAccounts,
  handleGetVendorPayoutAccountForReview,
  handleFinanceVerifyPayoutAccount,
  handleFinanceRejectPayoutAccount,
  handleClaimPayoutReview,
  handleReleasePayoutReview,
  handleEscalatePayoutReview,
  handleReassignPayoutReview,
  handleListPayoutReviewTargets,
} from "../../controllers/admin.finance.controller"

const financeRouter: Router = Router()

// Both gated on FINANCE_REPORTS_READ only — deliberately decoupled from
// VENDORS_OUTLETS_READ/SETTINGS_GEOGRAPHY_READ, see admin.finance.service.ts.
financeRouter.get("/outlets", requirePermission(AdminPermissions.FINANCE_REPORTS_READ), handleListOutletsForFinance)
financeRouter.get("/cities", requirePermission(AdminPermissions.FINANCE_REPORTS_READ), handleListCitiesForFinance)

// Vendor payout accounts — the Finance-domain operational verification queue
// (Finance → Vendor Payout Accounts). READ = FINANCE_PAYOUTS_READ (the
// finance role holds it); verify/reject reuse the existing
// VENDORS_PAYOUT_ACCOUNTS_MANAGE gate + service path so there is exactly one
// action + one audit trail regardless of which page it's triggered from.
// Scope (country) is enforced in the service WHERE clause, never a param.
financeRouter.get(
  "/payout-accounts",
  requirePermission(AdminPermissions.FINANCE_PAYOUTS_READ),
  handleListVendorPayoutAccounts,
)
financeRouter.get(
  "/payout-accounts/:accountId",
  requirePermission(AdminPermissions.FINANCE_PAYOUTS_READ),
  handleGetVendorPayoutAccountForReview,
)
financeRouter.post(
  "/payout-accounts/:accountId/verify",
  requirePermission(AdminPermissions.VENDORS_PAYOUT_ACCOUNTS_MANAGE),
  handleFinanceVerifyPayoutAccount,
)
financeRouter.post(
  "/payout-accounts/:accountId/reject",
  requirePermission(AdminPermissions.VENDORS_PAYOUT_ACCOUNTS_MANAGE),
  handleFinanceRejectPayoutAccount,
)

// Review workflow — claim before deciding, escalate to the open in-country
// pool, or reassign to a named admin. Same permission split and the same two
// distinct hand-offs the application/appeal queues use.
financeRouter.post(
  "/payout-accounts/:accountId/claim",
  requirePermission(AdminPermissions.VENDORS_PAYOUT_ACCOUNTS_CLAIM),
  handleClaimPayoutReview,
)
financeRouter.post(
  "/payout-accounts/:accountId/release",
  requirePermission(AdminPermissions.VENDORS_PAYOUT_ACCOUNTS_CLAIM),
  handleReleasePayoutReview,
)
financeRouter.post(
  "/payout-accounts/:accountId/escalate",
  requirePermission(AdminPermissions.VENDORS_PAYOUT_ACCOUNTS_ESCALATE),
  handleEscalatePayoutReview,
)
financeRouter.post(
  "/payout-accounts/:accountId/reassign",
  requirePermission(AdminPermissions.VENDORS_PAYOUT_ACCOUNTS_REASSIGN),
  handleReassignPayoutReview,
)
financeRouter.get(
  "/payout-accounts/:accountId/eligible-targets",
  requirePermission(AdminPermissions.VENDORS_PAYOUT_ACCOUNTS_REASSIGN),
  handleListPayoutReviewTargets,
)

export default financeRouter
