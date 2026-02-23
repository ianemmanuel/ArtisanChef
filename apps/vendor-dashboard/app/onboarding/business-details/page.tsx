import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { BusinessDetailsForm } from "@/components/onboarding/business-details"
import { Alert, AlertDescription } from "@repo/ui/components/alert"
import { InfoIcon } from "lucide-react"

export default async function BusinessDetailsPage() {
  const { userId, getToken } = await auth()
  if (!userId) redirect("/sign-in")

  const token = await getToken()
  if (!token) redirect("/sign-in")

  const headers = { Authorization: `Bearer ${token}` }
  let application: any = null
  let countries: any[] = []
  let hasDocuments = false
  let fetchError: string | null = null

  try {
    const [appRes, countriesRes] = await Promise.all([
      fetch(`${process.env.BACKEND_API_URL}/vendor/v1/application`, { headers, cache: "no-store" }),
      fetch(`${process.env.BACKEND_API_URL}/meta/v1/countries`, { headers, cache: "no-store" }),
    ])

    const appJson = await appRes.json()
    const countriesJson = await countriesRes.json()

    if (appRes.ok && appJson.status === "success") {
      application = appJson.data ?? null
      // Check if any non-withdrawn docs exist — used to trigger warning dialog in the form
      hasDocuments = application?.documents?.some((d: any) => d.status !== "WITHDRAWN") ?? false
    }

    if (countriesRes.ok && countriesJson.status === "success") {
      countries = countriesJson.data?.countries ?? []
    } else {
      fetchError = "Failed to load countries. Please refresh the page."
    }

    // Block editing if not in an editable state
    if (
      application &&
      application.status !== "DRAFT" &&
      application.status !== "REJECTED"
    ) {
      redirect("/onboarding")
    }
  } catch (err: any) {
    console.error("[BusinessDetailsPage]", err)
    fetchError = "Something went wrong loading the page. Please refresh."
  }

  return (
    <>
      {fetchError && (
        <Alert variant="destructive" className="mb-4">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}
      <BusinessDetailsForm
        application={application}
        countries={countries}
        hasDocuments={hasDocuments}
      />
    </>
  )
}