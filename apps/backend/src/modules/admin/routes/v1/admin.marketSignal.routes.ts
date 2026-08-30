import { Router } from "express"
import { AdminPermissions } from "@repo/types/enums"
import { requirePermission } from "@/modules/admin/middleware"
import { handleUpdateMarketSignalStatus } from "../../controllers/admin.marketSignal.controller"

const marketSignalRouter: Router = Router()

const WRITE = requirePermission(AdminPermissions.SETTINGS_ZONES_WRITE)

marketSignalRouter.patch("/:signalId/status", WRITE, handleUpdateMarketSignalStatus)

export default marketSignalRouter
