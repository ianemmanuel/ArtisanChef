import { redirect } from "next/navigation"
import { backendFetch, BackendApiError } from "@/lib/api/server"
import { onboardingRouteForState } from "@/lib/onboarding/lifecycle"
import { AccountStatusNotice } from "@/components/onboarding/AccountStatusNotice"
import { SyncingAccountNotice } from "@/components/auth/SyncingAccountNotice"
import { ServiceUnavailableNotice } from "@/components/auth/ServiceUnavailableNotice"
import type { VendorSessionData } from "@repo/types/vendor-app"

/*
 * The ONLY place that decides where an authenticated vendor lands.
 * Every other page trusts this table indirectly (by redirecting back
 * here, or to the specific route this table would have produced) —
 * nothing else re-derives routing from lifecycle state. Clerk identity
 * only proves who the visitor is; this backend session call is what
 * proves what they're allowed to see.
 */
export default async function RootPage() {
  let session: VendorSessionData

  try {
    session = await backendFetch<VendorSessionData>("/vendor/v1/auth/session")
  } catch (err) {
    if (err instanceof BackendApiError && err.code === "UNAUTHENTICATED") {
      redirect("/sign-in")
    }

    if (err instanceof BackendApiError && err.code === "VENDOR_USER_NOT_FOUND") {
      // Signed in with Clerk, but the signup webhook hasn't synced this
      // identity into Postgres yet — a brief, expected race, not an error.
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
          <SyncingAccountNotice />
        </div>
      )
    }

    if (err instanceof BackendApiError && err.code === "SERVICE_UNAVAILABLE") {
      // The backend is degraded (e.g. database unreachable) — not the
      // vendor's fault and not a reason to sign them out or crash.
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
          <ServiceUnavailableNotice />
        </div>
      )
    }

    throw err
  }

  if (session.state === "BANNED" || session.state === "SUSPENDED") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <AccountStatusNotice
          variant={session.state}
          reason={session.state === "BANNED" ? session.vendorUser.banReason : session.vendorAccount?.suspensionReason ?? null}
        />
      </div>
    )
  }

  if (session.state === "ACTIVE") {
    // ACTIVE splits on selling readiness: not-ready vendors go to the setup
    // command center, ready vendors to the operational dashboard. goLiveStatus
    // is the authoritative getVendorGoLiveStatus result (Vendor 1B) — never
    // re-derived here.
    redirect(session.goLiveStatus?.canGoLive ? "/dashboard" : "/setup")
  }

  redirect(onboardingRouteForState(session.state))
}
