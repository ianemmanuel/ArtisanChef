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

export default financeRouter
