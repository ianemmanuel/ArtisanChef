import { Router } from "express"
import { AdminPermissions } from "@repo/types/enums"
import { requirePermission } from "@/modules/admin/middleware"
import {
  handleListVendorTypes,
  handleGetVendorType,
  handleCreateVendorType,
  handleUpdateVendorType,
  handleActivateVendorType,
  handleDeactivateVendorType,
  handleGetVendorTypeStats,
} from "../../controllers/admin.vendorType.controller"

const vendorTypeRouter: Router = Router()

const READ  = requirePermission(AdminPermissions.SETTINGS_VENDOR_TYPES_READ)
const WRITE = requirePermission(AdminPermissions.SETTINGS_VENDOR_TYPES_WRITE)

vendorTypeRouter.get("/", READ, handleListVendorTypes)
vendorTypeRouter.post("/", WRITE, handleCreateVendorType)
vendorTypeRouter.get("/:vendorTypeId", READ, handleGetVendorType)
vendorTypeRouter.get("/:vendorTypeId/stats", READ, handleGetVendorTypeStats)
vendorTypeRouter.patch("/:vendorTypeId", WRITE, handleUpdateVendorType)
vendorTypeRouter.patch("/:vendorTypeId/activate", WRITE, handleActivateVendorType)
vendorTypeRouter.patch("/:vendorTypeId/deactivate", WRITE, handleDeactivateVendorType)

export default vendorTypeRouter
