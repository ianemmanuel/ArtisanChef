
import { Request, Response, NextFunction } from "express"
import { verifyClerkJwt } from "../../lib/clerk"

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

export async function clerkAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log("ENV CHECK:", {
    vendorIssuer: process.env.CLERK_VENDOR_ISSUER,
    vendorJwks: process.env.CLERK_VENDOR_JWKS_URL,
  })
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    console.log('clerkAuthMiddleware1')
    return res.status(401).json({ message: "Missing token" })
  }

  try {
    const token = header.replace("Bearer ", "")
    const auth = await verifyClerkJwt(token)

    req.auth = auth

    next()
  } catch(err) {
    console.log('clerkAuthMiddleware2 error:', err)
    return res.status(401).json({ message: "Unauthorized" })
  }
}
