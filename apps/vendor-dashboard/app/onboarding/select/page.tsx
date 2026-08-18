import { GetStartedForm } from "@/components/onboarding/get-started/GetStartedForm"

export default function GetStartedPage() {
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Let&apos;s get your business set up
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell us where you operate and what kind of business you run — we&apos;ll tailor the rest of
          onboarding to your country&apos;s requirements.
        </p>
      </div>
      <GetStartedForm />
    </div>
  )
}
