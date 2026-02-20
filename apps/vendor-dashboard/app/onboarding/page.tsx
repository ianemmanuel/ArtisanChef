import OnboardingNavbar from "@/components/onboarding/OnboardingNavbar"
import OnboardingFooter from "@/components/onboarding/OnboardingFooter"
import WizardLayout from "@/components/onboarding/WizardLayout"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

export default async function OnboardingPage() {
  const { userId, getToken } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  const token = await getToken()

  const backendUrl = process.env.BACKEND_API_URL!

  const [countriesRes, applicationRes] = await Promise.all([
    fetch(`${backendUrl}/meta/v1/countries/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 * 60 * 24 },
    }), 
    fetch(`${backendUrl}/vendor/v1/application`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }),
  ])

  if (!countriesRes.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">
          Server error: Failed to load onboarding metadata.
        </p>
      </div>
    )
  }

  const countries = await countriesRes.json()

  let initialApplication = null
  if (applicationRes.ok) {
    const json = await applicationRes.json()
    initialApplication = json.application ?? null
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <OnboardingNavbar />

      <main className="flex-1 flex items-start justify-center p-6 md:p-8 py-12">
        <div className="w-full max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Vendor Application
            </h1>
            <p className="text-lg text-muted-foreground">
              Complete your vendor registration to start selling on our platform
            </p>
          </div>

          <WizardLayout
            countries={countries}
            initialApplication={initialApplication}
          />
        </div>
      </main>

      <OnboardingFooter />
    </div>
  )
}
