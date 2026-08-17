import { Router } from "express"
import { AdminPermissions } from "@repo/types/enums"
import { requirePermission } from "@/modules/admin/middleware"
import {
  handleListActionReasons,
  handleGetActionReason,
  handleCreateActionReason,
  handleUpdateActionReason,
} from "../../controllers/admin.actionReason.controller"

const actionReasonRouter: Router = Router()

// Reading reasons to populate a reject/needs-revision UI reuses the
// existing review permission — no new read permission, per approved decision.
const READ  = requirePermission(AdminPermissions.VENDORS_APPLICATIONS_REVIEW)
const WRITE = requirePermission(AdminPermissions.SETTINGS_ACTION_REASONS_WRITE)

actionReasonRouter.get("/", READ, handleListActionReasons)
actionReasonRouter.post("/", WRITE, handleCreateActionReason)
actionReasonRouter.get("/:id", READ, handleGetActionReason)
actionReasonRouter.patch("/:id", WRITE, handleUpdateActionReason)

export default actionReasonRouter
