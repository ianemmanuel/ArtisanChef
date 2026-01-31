
import { Request, Response, NextFunction } from "express"
import { verifyClerkJwt } from "../../services/clerk"

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
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" })
  }

  try {
    const token = header.replace("Bearer ", "")
    const auth = await verifyClerkJwt(token)

    req.auth = auth

    next()
  } catch {
    return res.status(401).json({ message: "Unauthorized" })
  }
}
