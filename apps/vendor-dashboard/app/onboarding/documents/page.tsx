import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { DocumentsForm } from "@/components/onboarding/documents"

export const dynamic = "force-dynamic"

const backendUrl = process.env.BACKEND_API_URL!

export default async function DocumentsPage() {
  const { getToken, userId } = await auth()

  if (!userId) redirect("/sign-in")

  const token = await getToken()
  if (!token) redirect("/sign-in")

  // 1️⃣ Fetch application
  const appRes = await fetch(`${backendUrl}/vendor/v1/application`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  const appJson = await appRes.json()

  if (!appRes.ok || appJson.status !== "success") {
    redirect("/onboarding/business-details")
  }

  const application = appJson.data

  if (
    application.status !== "DRAFT" &&
    application.status !== "REJECTED"
  ) {
    redirect("/onboarding")
  }

  // 2️⃣ Fetch documents
  const docsRes = await fetch(
    `${backendUrl}/vendor/v1/documents/requirements/${application.id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  )

  const docsJson = await docsRes.json()

  if (!docsRes.ok || docsJson.status !== "success") {
    redirect("/onboarding")
  }

  const { requirements, progress } = docsJson.data

  return (
    <DocumentsForm
      applicationId={application.id}
      requirements={requirements}
      initialProgress={progress}
    />
  )
}