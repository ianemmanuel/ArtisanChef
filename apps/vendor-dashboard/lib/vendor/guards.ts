import { cache } from "react"
import { redirect } from "next/navigation"
import { backendFetch, BackendApiError } from "@/lib/api/server"
import type { VendorSessionData } from "@repo/types/vendor-app"

/*
 * Server-only. The vendor-dashboard's routing/access brain.
 *
 * "/" is the one router (app/page.tsx) — it inspects lifecycle + readiness
 * and sends the vendor to the right place. These guards are the enforcement
 * for a vendor who navigates straight to a protected route instead:
 *
 *   requireSetupAccess()       — an ACTIVE vendor (readiness NOT required)
 *   requireOperationalAccess() — an ACTIVE, selling-ready vendor
 *
 * Both bounce anything else back to "/", which re-routes it correctly (to
 * onboarding, the application-status screen, the suspended/banned notice,
 * or /setup). They are a UX boundary — the real authorization lives in the
 * backend (requireVendorState / getVendorGoLiveStatus / publishVendorProfile
 * all enforce server-side regardless of which page called them).
 *
 * getVendorSession is React-cached so a layout and the page's own guard in
 * the same render share a single /auth/session round-trip.
 */
export const getVendorSession = cache(async (): Promise<VendorSessionData | null> => {
  try {
    return await backendFetch<VendorSessionData>("/vendor/v1/auth/session")
  } catch (err) {
    if (err instanceof BackendApiError && err.code === "UNAUTHENTICATED") redirect("/sign-in")
    // Identity not synced yet, or backend degraded — "/" renders the right
    // notice for these; a protected route just sends the vendor there.
    if (err instanceof BackendApiError && (err.code === "VENDOR_USER_NOT_FOUND" || err.code === "SERVICE_UNAVAILABLE")) {
      return null
    }
    throw err
  }
})

/** True once the authoritative getVendorGoLiveStatus says the vendor can go live. */
export function isSellingReady(session: VendorSessionData | null): boolean {
  return session?.state === "ACTIVE" && !!session.goLiveStatus?.canGoLive
}

export async function requireSetupAccess(): Promise<VendorSessionData> {
  const session = await getVendorSession()
  if (!session || session.state !== "ACTIVE") redirect("/")
  return session
}

export async function requireOperationalAccess(): Promise<VendorSessionData> {
  const session = await getVendorSession()
  if (!session || session.state !== "ACTIVE") redirect("/")
  if (!isSellingReady(session)) redirect("/setup")
  return session
}
