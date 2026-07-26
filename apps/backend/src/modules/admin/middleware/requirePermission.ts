import { Request, Response, NextFunction } from "express"
import type { AdminPermissionKey } from "@repo/types/enums"
import type { AdminRequest } from "@repo/types/backend"

import { ApiError } from "@/errors/apiError"
import { HttpStatus } from "@/constants/httpStatus"

/**
 * STEP 6 — Gate a specific route behind a permission check.
 *
 * This is a factory function — call it per route with the required permission:
 *
 *   router.post("/approve", requirePermission(AdminPermissions.VENDORS_APPROVE), handler)
 *
 * The check is O(1) — Array.includes on the flat string array set by loadPermissions.
 *
 * Always use AdminPermissions constants (from @repo/types), never raw strings.
 * A typo in a constant is a compile error. A typo in a string is a silent bug.
 */
export function requirePermission(permission: AdminPermissionKey) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { adminPermissions } = req as AdminRequest

    if (!(adminPermissions ?? []).includes(permission)) {
      return next(new ApiError(
        HttpStatus.FORBIDDEN,
        "You do not have permission to perform this action",
        "FORBIDDEN",
      ))
    }

    next()
  }
}