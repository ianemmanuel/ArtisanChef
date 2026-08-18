import { redirect } from "next/navigation"
import { backendFetch } from "@/lib/api/server"
import { ReviewSummary } from "@/components/onboarding/review/ReviewSummary"
import type { ApplicationPreview } from "@/lib/api/types"

export default async function ReviewPage() {
  const preview = await backendFetch<ApplicationPreview>("/vendor/v1/application/preview")

  if (preview.application.status !== "DRAFT" && preview.application.status !== "NEEDS_REVISION") {
    redirect("/application/pending")
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Review your application
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Double-check everything below before submitting for review.
        </p>
      </div>

      <ReviewSummary preview={preview} />
    </div>
  )
}
