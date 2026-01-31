import jwt from "jsonwebtoken"
import jwksClient, { JwksClient } from "jwks-rsa"
import { CLERK_PROJECTS, ClerkAppType } from "../../auth/clerk/clerkProjects"

export type VerifiedClerkToken = {
  clerkUserId: string
  app: ClerkAppType
  issuer: string
}

const jwksClients = new Map<string, JwksClient>()

for (const [, cfg] of Object.entries(CLERK_PROJECTS)) {
  jwksClients.set(
    cfg.issuer,
    jwksClient({ jwksUri: cfg.jwksUrl })
  )
}

export async function verifyClerkJwt(token: string): Promise<VerifiedClerkToken> {
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

  // Find app by issuer
  const appEntry = Object.entries(CLERK_PROJECTS).find(
    ([, cfg]) => cfg.issuer === iss
  )

  if (!appEntry) {
    throw new Error("Untrusted Clerk issuer")
  }

  const [app] = appEntry
  const client = jwksClients.get(iss)

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
