import { Router } from "express"
import { AdminPermissions } from "@repo/types/enums"
import { requirePermission } from "@/modules/admin/middleware"
import {
  handleGetZone,
  handleUpdateZone,
  handleSetZoneLevel,
  handleSetZoneOperationalStatus,
  handleActivateZone,
  handleDeactivateZone,
  handleDeleteZone,
} from "../../controllers/admin.zone.controller"

const zoneRouter: Router = Router()

const READ      = requirePermission(AdminPermissions.SETTINGS_ZONES_READ)
const WRITE     = requirePermission(AdminPermissions.SETTINGS_ZONES_WRITE)
// Capability-level changes are the strategic decision (e.g. enabling meal
// plans in a zone) — gated separately from routine zone editing.
const SET_LEVEL = requirePermission(AdminPermissions.SETTINGS_ZONES_SET_LEVEL)

zoneRouter.get("/:zoneId", READ, handleGetZone)
zoneRouter.patch("/:zoneId", WRITE, handleUpdateZone)
zoneRouter.patch("/:zoneId/level", SET_LEVEL, handleSetZoneLevel)
zoneRouter.patch("/:zoneId/operational-status", WRITE, handleSetZoneOperationalStatus)
zoneRouter.patch("/:zoneId/activate", WRITE, handleActivateZone)
zoneRouter.patch("/:zoneId/deactivate", WRITE, handleDeactivateZone)
zoneRouter.delete("/:zoneId", WRITE, handleDeleteZone)

export default zoneRouter
