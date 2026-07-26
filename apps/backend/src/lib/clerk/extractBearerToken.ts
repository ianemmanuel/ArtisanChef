import type { Request } from "express"

/*
 * Extracts the token from an `Authorization: Bearer <token>` header.
 * Returns null if the header is missing or not in Bearer format —
 * callers decide how to respond, and every current caller responds
 * with a generic 401 regardless of which of these cases it was.
 */
export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) return null
  return header.slice("Bearer ".length)
}