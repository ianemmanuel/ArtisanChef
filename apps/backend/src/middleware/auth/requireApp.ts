import { Request, Response, NextFunction } from "express"
import { ClerkAppType } from "@/lib/clerk"

/**
 * Enforces that the authenticated JWT belongs to the expected Clerk app.
 * Must be used AFTER clerkAuthMiddleware.
 */
export function requireApp(expectedApp: ClerkAppType) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      console.log('requireapp')
      return res.status(401).json({ message: "1Unauthorized" })
    }
    
    if (req.auth.app !== expectedApp) {
      return res.status(403).json({
        message: "Invalid token for this application",
        expected: expectedApp,
        received: req.auth.app,
      })
    }

    next()
  }
}