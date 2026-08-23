import { createClerkClient } from "@clerk/backend"
import { VendorApplicationStatus } from "@repo/db"

import { env } from "@/env"
import { logger } from "@/lib/pino/logger"

const clerkLog = logger.child({ module: "clerk-metadata" })

/*
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

  /**
   * Bans the user — Clerk revokes all their active sessions as a
   * side effect and blocks future sign-in. Used by admin's banVendor.
   * Propagates errors rather than swallowing them; the caller decides
   * how to handle a Clerk failure (banVendor treats it as best-effort
   * once the DB-level ban has already succeeded).
   */
  static async banUser(clerkUserId: string) {
    return this.client.users.banUser(clerkUserId)
  }

  /** Reverses banUser. Used by admin's unbanVendor. */
  static async unbanUser(clerkUserId: string) {
    return this.client.users.unbanUser(clerkUserId)
  }
}

// ── Admin-specific state ──────────────────────────────────────────────────────
//
// Every admin-Clerk mutation lives here — this is the ONLY place in the
// codebase that should construct an admin Clerk client. admin.user.service.ts
// and the admin Clerk webhook service both call into this instead of
// building their own client, which is what happened before this consolidation
// (three independent client constructions for the same Clerk instance).

export class ClerkAdminStateService {
  private static get client() {
    return getClerkClient("admin")
  }

  /**
   * Revoke all active sessions for an admin user without banning them
   * — e.g. "force re-login everywhere" without blocking future sign-in.
   * Note: banUser() already revokes all sessions as a side effect
   * (confirmed via Clerk's own docs), so this is NOT needed as part
   * of suspend/deactivate — those call banUser/deleteUser directly.
   * This throws on failure — a failed revocation is security-relevant,
   * not a cosmetic sync issue.
   */
  static async revokeAllSessions(clerkUserId: string) {
    const sessions = await this.client.sessions.getSessionList({ userId: clerkUserId })
    await Promise.all(
      sessions.data
        .filter((s) => s.status === "active")
        .map((s) => this.client.sessions.revokeSession(s.id))
    )
  }

  /**
   * Bans the user — Clerk revokes all their active sessions as a
   * side effect and blocks future sign-in. Used by suspendAdminUser.
   */
  static async banUser(clerkUserId: string) {
    return this.client.users.banUser(clerkUserId)
  }

  /** Reverses banUser. Used by reinstateAdminUser. */
  static async unbanUser(clerkUserId: string) {
    return this.client.users.unbanUser(clerkUserId)
  }

  /**
   * Permanently deletes the Clerk identity. Used by deactivateAdminUser
   * (deliberate — deactivation is not reversible the way suspension is)
   * and by the admin webhook service to clean up unauthorized/ineligible
   * signups.
   */
  static async deleteUser(clerkUserId: string) {
    return this.client.users.deleteUser(clerkUserId)
  }

  /** Used by sendAdminInvitation. */
  static async createInvitation(params: {
    emailAddress  : string
    redirectUrl   : string
    publicMetadata: Record<string, unknown>
    expiresInDays : number
  }) {
    return this.client.invitations.createInvitation({
      emailAddress  : params.emailAddress,
      redirectUrl   : params.redirectUrl,
      publicMetadata: params.publicMetadata,
      expiresInDays : params.expiresInDays,
      notify        : true,
    })
  }
}