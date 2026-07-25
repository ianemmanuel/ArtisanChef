import { Request, Response, NextFunction } from "express"

import { verifyClerkJwt } from "@/lib/clerk"
import { ApiError } from "@/middleware/error/"
import { HttpStatus } from "@/constants/httpStatus"
import { logger } from "@/lib/pino/logger"

const authLog = logger.child({ module: "auth:clerk" })

declare global {
  namespace Express {
    interface Request {
      auth?: {
        clerkUserId: string
        app: "customer" | "vendor" | "courier" | "admin"
        issuer: string
      }
    }
  }
}

/*
 * Generic multi-app Clerk verifier. Attaches req.auth for whichever
 * app issued the token — pair with requireApp() to enforce a
 * specific one. Admin has its own dedicated authenticateAdmin()
 * instead (see modules/admin/middleware) since its downstream chain
 * needs more than this generic shape provides.
*/

export async function clerkAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization

  if (!header?.startsWith("Bearer ")) {
    return next(new ApiError(HttpStatus.UNAUTHORIZED, "Missing token", "MISSING_TOKEN"))
  }

  try {
    const token = header.replace("Bearer ", "")
    const auth  = await verifyClerkJwt(token)

    req.auth = auth
    next()
  } catch (err) {
    authLog.debug({ err }, "Token verification failed")
    next(new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized", "INVALID_TOKEN"))
  }
}