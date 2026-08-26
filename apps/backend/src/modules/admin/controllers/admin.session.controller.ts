import { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import { AdminPermissions } from "@repo/types/enums"
import { sendSuccess } from "@/helpers/api-response/response"
import { buildAdminSession } from "../services/admin.session.service"
import { hasOpenComplianceIssuesForCountries } from "../services/admin.vendor.compliance.service"

/**
 * GET /api/admin/v1/auth/session
 *
 * Returns the current admin's identity, role, permissions, and scope.
 * buildAdminSession itself stays a pure, zero-DB-call transform — the one
 * extra query here (cheap, indexed) is the sidebar's Compliance nav dot,
 * only ever run for a country-scoped admin who'd actually see that item.
 * This endpoint is revalidated every 5 minutes on the frontend, so the
 * dot's freshness is already "subtle glow," not a live counter.
 */
export const getAdminSession: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminPermissions, adminScope } = req as unknown as AdminRequest
    const session = buildAdminSession(adminUser, adminPermissions, adminScope)

    if (!adminScope.isGlobal && adminScope.countryIds.length > 0 && adminPermissions.includes(AdminPermissions.VENDORS_COMPLIANCE_READ)) {
      session.hasOpenComplianceIssues = await hasOpenComplianceIssuesForCountries(adminScope.countryIds)
    }

    return sendSuccess(res, session)
  } catch (err) { next(err) }
}