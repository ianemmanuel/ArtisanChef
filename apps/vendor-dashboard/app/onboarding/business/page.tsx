import { redirect } from "next/navigation"
import { backendFetch } from "@/lib/api/server"
import { BusinessForm } from "@/components/onboarding/business/BusinessForm"
import { RevisionBanner } from "@/components/onboarding/business/RevisionBanner"
import type { VendorApplicationDetail } from "@repo/types/vendor-app"

export default async function BusinessPage() {
  const application = await backendFetch<VendorApplicationDetail>("/vendor/v1/application/get")

  // The backend is the authorization boundary for editability
  // (ensureApplicationEditable) — this is a routing convenience only,
  // so a vendor who lands here mid-review sees the right page instead
  // of a form that would reject their save.
  if (application.status !== "DRAFT" && application.status !== "NEEDS_REVISION") {
    redirect("/application/pending")
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Business application
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell us about your business. You can save and come back at any time before submitting.
        </p>
      </div>

      {application.status === "NEEDS_REVISION" && (
        <RevisionBanner
          reasonCode={application.reasonCode}
          rejectionReason={application.rejectionReason}
          revisionNotes={application.revisionNotes}
        />
      )}

      <BusinessForm application={application} />
    </div>
  )
}
