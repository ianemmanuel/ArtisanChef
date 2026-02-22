import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getApplication, getApplicationPreview } from "@/lib/api"
import { ReviewForm } from "@/components/onboarding"

export default async function ReviewPage() {
  const { getToken, userId } = await auth()
  if (!userId) redirect("/sign-in")

  const token = await getToken()
  if (!token) redirect("/sign-in")

  const { data: application } = await getApplication(token)

  if (!application) redirect("/onboarding/business-details")

  if (application.status !== "DRAFT" && application.status !== "REJECTED") {
    redirect("/onboarding")
  }

  const { data: preview } = await getApplicationPreview(token, application.id)

  // If required docs not complete, bounce back to documents
  if (!preview?.canSubmit) {
    redirect("/onboarding/documents")
  }

  return <ReviewForm preview={preview} />
}