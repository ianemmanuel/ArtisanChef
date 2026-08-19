import { redirect } from "next/navigation"
import { backendFetch } from "@/lib/api/server"
import { OnboardingShell } from "@/components/onboarding/OnboardingShell"
import { AccountStatusNotice } from "@/components/onboarding/AccountStatusNotice"
import type { VendorSessionData } from "@repo/types/vendor-app"

/*
 * Coarse, server-side routing gate for the entire /onboarding tree.
 * The backend's session `state` is the single source of truth — a
 * vendor who's already ACTIVE has no business in the onboarding flow
 * and is redirected straight to the real dashboard. Fine-grained
 * routing between onboarding sub-steps (get-started vs business vs
 * pending) is each page's own concern.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await backendFetch<VendorSessionData>("/vendor/v1/auth/session")

  if (session.state === "ACTIVE") {
    redirect("/dashboard")
  }

  if (session.state === "PENDING_REVIEW" || session.state === "REJECTED") {
    redirect("/application/status")
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

  return <OnboardingShell>{children}</OnboardingShell>
}
