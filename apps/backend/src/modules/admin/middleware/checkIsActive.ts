import { Request, Response, NextFunction } from "express"
import { prisma, AdminUserStatus } from "@repo/db"
import type { AdminRequest } from "@repo/types/backend"

import { ApiError } from "@/errors/apiError"
import { HttpStatus } from "@/constants/httpStatus"
import { logger } from "@/lib/pino/logger"

const authLog = logger.child({ module: "auth:check-active" })

/*
 * STEP 3 — Enforce that the admin account is in an active state.
 * Checks status enum for precise error messages per state.
 * Updates lastSeenAt fire-and-forget — never blocks the request.
 */
export async function checkIsActive(req: Request, _res: Response, next: NextFunction) {
  const { adminUser } = req as AdminRequest

  if (!adminUser) {
    return next(new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized", "UNAUTHORIZED"))
  }

  switch (adminUser.status as AdminUserStatus) {
    case AdminUserStatus.active:
      break

    case AdminUserStatus.suspended:
      authLog.warn({ adminUserId: adminUser.id }, "Blocked request — account suspended")
      return next(new ApiError(
        HttpStatus.FORBIDDEN,
        "This account has been suspended. Contact your administrator.",
        "ACCOUNT_SUSPENDED",
      ))

    case AdminUserStatus.deactivated:
      authLog.warn({ adminUserId: adminUser.id }, "Blocked request — account deactivated")
      return next(new ApiError(
        HttpStatus.FORBIDDEN,
        "This account has been deactivated. Contact your administrator.",
        "ACCOUNT_DEACTIVATED",
      ))

    case AdminUserStatus.pending:
    case AdminUserStatus.invited:
    default:
      authLog.warn({ adminUserId: adminUser.id, status: adminUser.status }, "Blocked request — account not activated")
      return next(new ApiError(
        HttpStatus.FORBIDDEN,
        "This account has not been activated yet.",
        "ACCOUNT_NOT_ACTIVATED",
      ))
  }

  // Fire and forget — never blocks the request
  void prisma.adminUser
    .update({ where: { id: adminUser.id }, data: { lastSeenAt: new Date() } })
    .catch((err) => authLog.warn({ err, adminUserId: adminUser.id }, "lastSeenAt update failed"))

  next()
}