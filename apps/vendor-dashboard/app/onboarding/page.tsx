import { redirect } from "next/navigation"
import { backendFetch } from "@/lib/api/server"
import { onboardingRouteForState } from "@/lib/onboarding/lifecycle"
import type { VendorSessionData } from "@repo/types/vendor-app"

//* Entry point — always redirects to whichever step matches the
//* vendor's actual backend-derived state. Never a page in its own right.
export default async function OnboardingIndexPage() {
  const session = await backendFetch<VendorSessionData>("/vendor/v1/auth/session")
  redirect(onboardingRouteForState(session.state))
}
