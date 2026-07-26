import { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { buildAdminSession } from "../services/admin.session.service"

/**
 * GET /api/admin/v1/auth/session
 *
 * Returns the current admin's identity, role, permissions, and scope.
 * All data already loaded by adminAuthChain — zero additional DB calls.
 */
export const getAdminSession: RequestHandler = (req, res, next) => {
  try {
    const { adminUser, adminPermissions, adminScope } = req as unknown as AdminRequest
    const session = buildAdminSession(adminUser, adminPermissions, adminScope)
    return sendSuccess(res, session)
  } catch (err) { next(err) }
}