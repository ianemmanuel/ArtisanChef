import { Router } from "express"
import { AdminPermissions } from "@repo/types/enums"
import { requirePermission } from "@/modules/admin/middleware"
import { handleListOutletsForFinance, handleListCitiesForFinance } from "../../controllers/admin.finance.controller"

const financeRouter: Router = Router()

// Both gated on FINANCE_REPORTS_READ only — deliberately decoupled from
// VENDORS_OUTLETS_READ/SETTINGS_GEOGRAPHY_READ, see admin.finance.service.ts.
financeRouter.get("/outlets", requirePermission(AdminPermissions.FINANCE_REPORTS_READ), handleListOutletsForFinance)
financeRouter.get("/cities", requirePermission(AdminPermissions.FINANCE_REPORTS_READ), handleListCitiesForFinance)

export default financeRouter
