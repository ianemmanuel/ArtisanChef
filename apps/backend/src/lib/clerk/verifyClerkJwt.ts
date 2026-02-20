import jwt from "jsonwebtoken"
import jwksClient, { JwksClient } from "jwks-rsa"
import { getClerkProjects, ClerkAppType } from "./clerkProjects"

export type VerifiedClerkToken = {
  clerkUserId: string
  app: ClerkAppType
  issuer: string
}

let _clients: Map<string, JwksClient> | null = null

function getClients(): Map<string, JwksClient> {
  if (_clients) return _clients
  _clients = new Map()

  const projects = getClerkProjects()

  for (const [, cfg] of Object.entries(projects)) {
    if (!cfg.issuer || !cfg.jwksUrl) {
      throw new Error(
        `Missing Clerk env vars — check CLERK_*_ISSUER and CLERK_*_JWKS_URL in your .env`
      )
    }
    _clients.set(cfg.issuer, jwksClient({ jwksUri: cfg.jwksUrl }))
  }

  return _clients
}

export async function verifyClerkJwt(token: string): Promise<VerifiedClerkToken> {
  const clients = getClients()
  const projects = getClerkProjects()

  const decoded = jwt.decode(token, { complete: true }) as jwt.Jwt | null

  if (
    !decoded ||
    typeof decoded !== "object" ||
    !decoded.payload ||
    typeof decoded.payload === "string"
  ) {
    throw new Error("Invalid JWT")
  }

  const { iss, sub } = decoded.payload as jwt.JwtPayload
  const kid = decoded.header?.kid

  if (!iss || !sub || !kid) {
    throw new Error("Invalid JWT claims")
  }

  const appEntry = Object.entries(projects).find(
    ([, cfg]) => cfg.issuer === iss
  )

  if (!appEntry) {
    throw new Error(`Untrusted Clerk issuer: ${iss}`)
  }

  const [app] = appEntry
  const client = clients.get(iss)

  if (!client) {
    throw new Error("JWKS client not configured")
  }

  const key = await client.getSigningKey(kid)
  const publicKey = key.getPublicKey()

  jwt.verify(token, publicKey, { issuer: iss })

  return {
    clerkUserId: sub,
    issuer: iss,
    app: app as ClerkAppType,
  }
}