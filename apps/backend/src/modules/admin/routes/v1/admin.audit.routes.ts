import { Router } from "express"
import { AdminPermissions } from "@repo/types/enums"
import { requirePermission } from "@/modules/admin/middleware"
import { requireIdentityAccess } from "@/modules/admin/middleware/identity/requireIdentityAccess"
import { handleListAuditLogs, handleGetAuditLog } from "../../controllers/admin.audit.controller"

/**
 * Identity & Access audit trail — read-only. Mounted at: /api/admin/v1/audit
 *
 * Same defence-in-depth pattern as admin.user.routes.ts: requireIdentityAccess
 * blocks non-identity roles at the route level, requirePermission checks the
 * specific grant, and the service layer (admin.audit.service.ts) enforces
 * scope with full DB context.
 */
const router: Router = Router()

router.use(requireIdentityAccess)

const READ = requirePermission(AdminPermissions.AUDIT_LOGS_ALL_READ)

router.get("/",    READ, handleListAuditLogs)
router.get("/:id", READ, handleGetAuditLog)

export default router
