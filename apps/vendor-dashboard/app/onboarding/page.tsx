import OnboardingNavbar from "@/components/onboarding/OnboardingNavbar"
import OnboardingFooter from "@/components/onboarding/OnboardingFooter"
import WizardLayout from "@/components/onboarding/WizardLayout"

export default async function OnboardingPage() {
  const [countriesRes, vendorTypesRes, applicationRes] = await Promise.all([
    fetch(`${process.env.BACKEND_API_URL}/vendor/countries`, {
      cache: "force-cache",
      next: { revalidate: 60 * 60 * 24 },
    }),
    fetch(`${process.env.BACKEND_API_URL}/vendor/vendor-types`, {
      cache: "force-cache",
      next: { revalidate: 60 * 60 * 24 },
    }),
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/vendor/application`, {
      cache: "no-store",
    }),
  ])

  if (!countriesRes.ok || !vendorTypesRes.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">
          Server error: Failed to load onboarding metadata.
        </p>
      </div>
    )
  }

  const countries = await countriesRes.json()
  const vendorTypes = await vendorTypesRes.json()

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
            vendorTypes={vendorTypes}
            initialApplication={initialApplication}
          />
        </div>
      </main>

      <OnboardingFooter />
    </div>
  )
}
