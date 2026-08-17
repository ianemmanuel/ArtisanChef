import { Request, Response, NextFunction } from "express"
import type { VendorRequest, VendorLifecycleState } from "@repo/types/backend"

import { ApiError } from "@/errors/ApiError"
import { HttpStatus } from "@/constants/httpStatus"

/*
 * STEP 3 — gate a specific route behind one or more allowed lifecycle
 * states. Synchronous — reads req.vendor.state, no DB call. Mirrors
 * requirePermission() in the admin module.
 *
 *   router.post("/menu", requireVendorState("ACTIVE"), handler)
 */
export function requireVendorState(...allowed: VendorLifecycleState[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { vendor } = req as VendorRequest

    if (!vendor) {
      return next(new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized", "MISSING_VENDOR_CONTEXT"))
    }

    if (!allowed.includes(vendor.state)) {
      return next(new ApiError(
        HttpStatus.FORBIDDEN,
        "This action isn't available for your account's current state",
        "INVALID_VENDOR_STATE",
      ))
    }

    next()
  }
}