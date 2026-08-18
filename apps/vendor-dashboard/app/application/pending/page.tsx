import { redirect } from "next/navigation"
import { backendFetch, BackendApiError } from "@/lib/api/server"
import { ApplicationStatusCard } from "@/components/onboarding/status/ApplicationStatusCard"
import type { VendorSessionData } from "@repo/types/vendor-app"

/*
 * Only PENDING_REVIEW and REJECTED belong here. Every other state gets
 * bounced back to "/" — the single place that knows where each lifecycle
 * state actually routes — rather than this page hardcoding a second copy
 * of that table.
 */
export default async function ApplicationPendingPage() {
  let session: VendorSessionData

  try {
    session = await backendFetch<VendorSessionData>("/vendor/v1/auth/session")
  } catch (err) {
    if (err instanceof BackendApiError) {
      redirect("/")
    }
    throw err
  }

  if (!session.application || (session.state !== "PENDING_REVIEW" && session.state !== "REJECTED")) {
    redirect("/")
  }

  return (
    <div className="mx-auto flex max-w-lg items-center justify-center">
      <ApplicationStatusCard application={session.application} />
    </div>
  )
}
