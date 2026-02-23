import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { ReviewForm } from "@/components/onboarding/review"
import { Alert, AlertDescription } from "@repo/ui/components/alert"
import { InfoIcon } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ReviewPage() {
  const { getToken, userId } = await auth()
  if (!userId) redirect("/sign-in")

  const token = await getToken()
  if (!token) redirect("/sign-in")

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }

  // 1️⃣ Get application first — we need the ID before we can fetch the preview
  const appRes = await fetch(`${process.env.BACKEND_API_URL}/vendor/v1/application`, {
    method: "GET",
    headers,
    cache: "no-store",
  })
  const appJson = await appRes.json()

  if (!appRes.ok || appJson.status !== "success") {
    redirect("/onboarding/business-details")
  }

  const application = appJson.data

  if (application.status !== "DRAFT" && application.status !== "REJECTED") {
    redirect("/onboarding")
  }

  // 2️⃣ Now fetch the full preview — we couldn't do this in parallel above
  //    because we needed application.id first. Single extra request is fine.
  const previewRes = await fetch(
    `${process.env.BACKEND_API_URL}/vendor/v1/application/${application.id}/preview`,
    { method: "GET", headers, cache: "no-store" }
  )
  const previewJson = await previewRes.json()

  if (!previewRes.ok || previewJson.status !== "success") {
    return (
      <Alert variant="destructive">
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Failed to load your application preview. Please go back and try again.
        </AlertDescription>
      </Alert>
    )
  }

  const {
    application: fullApplication,
    requirements = [],
    progress,
    canSubmit = false,
  } = previewJson.data ?? {}

  if (!fullApplication || !progress) {
    console.error("[ReviewPage] Unexpected response shape:", previewJson.data)
    return (
      <Alert variant="destructive">
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Failed to load your application. Please go back and try again.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <ReviewForm
      application={fullApplication}
      requirements={requirements}
      progress={progress}
      canSubmit={canSubmit}
    />
  )
}