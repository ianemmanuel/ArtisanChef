import { createClerkClient } from "@clerk/backend"
import { VendorApplicationStatus } from "@repo/db"

import { env } from "@/env"
import { logger } from "@/lib/pino/logger"

const clerkLog = logger.child({ module: "clerk-metadata" })

/**
 * Only vendor and admin have a Clerk backend client — customer and
 * courier are JWKS-verify-only by design (see env.ts). Narrowing the
 * type here means calling getClerkClient("customer") is a compile
 * error, not a "missing env var" surprise at runtime.
 */
type ClientAppType = "vendor" | "admin"

const _clerkClients = new Map<ClientAppType, ReturnType<typeof createClerkClient>>()

function getClerkClient(app: ClientAppType) {
  if (_clerkClients.has(app)) return _clerkClients.get(app)!

  const secretKey = app === "vendor" ? env.CLERK_VENDOR_SECRET_KEY : env.CLERK_ADMIN_SECRET_KEY

  const client = createClerkClient({ secretKey })
  _clerkClients.set(app, client)
  return client
}

//* Vendor-specific metadata

export class ClerkVendorStateService {
  private static get client() {
    return getClerkClient("vendor")
  }

  /**
   * Mirrors vendor application status into Clerk's publicMetadata so
   * the frontend can read it straight off the session without an
   * extra API call. Postgres remains the source of truth — nothing
   * on the backend ever reads this value back. A failure here is
   * logged, not thrown: the Postgres write this is called after has
   * already succeeded, and failing the whole request over a
   * best-effort read-optimization would make a successful operation
   * look failed to the caller.
   */
  static async setVendorApplicationStatus(
    clerkUserId: string,
    status: VendorApplicationStatus
  ) {
    try {
      await this.client.users.updateUser(clerkUserId, {
        publicMetadata: { vendorApplicationStatus: status },
      })
    } catch (err) {
      clerkLog.warn({ err, clerkUserId, status }, "Failed to mirror vendor application status to Clerk")
    }
  }

  static async clearVendorApplicationState(clerkUserId: string) {
    try {
      await this.client.users.updateUser(clerkUserId, {
        publicMetadata: { vendorApplicationStatus: null },
      })
    } catch (err) {
      clerkLog.warn({ err, clerkUserId }, "Failed to clear vendor application state in Clerk")
    }
  }
}

//* Admin-specific metadata

export class ClerkAdminStateService {
  private static get client() {
    return getClerkClient("admin")
  }

  /**
   * Revoke all active sessions for an admin user.
   * Called immediately when an admin is deactivated or offboarded.
   * Ensures the user cannot complete any in-flight requests after
   * deactivation — this one DOES throw on failure, since a failed
   * revocation is a security-relevant failure the caller needs to
   * know about, not a cosmetic sync issue.
   */
  static async revokeAllSessions(clerkUserId: string) {
    const sessions = await this.client.sessions.getSessionList({ userId: clerkUserId })
    await Promise.all(
      sessions.data
        .filter((s) => s.status === "active")
        .map((s) => this.client.sessions.revokeSession(s.id))
    )
  }
}