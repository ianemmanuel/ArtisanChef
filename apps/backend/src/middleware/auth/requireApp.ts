import { Request, Response, NextFunction } from "express"
import { ClerkAppType } from "@/lib/clerk"
import { ApiError } from "@/errors/apiError"
import { HttpStatus } from "@/constants/httpStatus"

/*
 * Enforces that the authenticated JWT belongs to the expected Clerk app.
 * Must be used AFTER clerkAuthMiddleware.
*/
export function requireApp(expectedApp: ClerkAppType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized", "MISSING_AUTH_CONTEXT"))
    }

    if (req.auth.app !== expectedApp) {
      return next(new ApiError(
        HttpStatus.FORBIDDEN,
        "Invalid token for this application",
        "WRONG_APP",
        [{ field: "app", message: `expected ${expectedApp}, received ${req.auth.app}` }],
      ))
    }

    next()
  }
}