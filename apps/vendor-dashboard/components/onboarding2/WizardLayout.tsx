"use client"

import { useEffect, useState, useCallback } from "react"
import { Loader2 } from "lucide-react"
import { useOnboardingStore } from "@/lib/state/onboarding-store"
import BusinessDetailsStep from "./BusinessDetailsStep"
import DocumentsStep from "./DocumentsStep"
import ReviewStep from "./ReviewStep"

interface WizardLayoutProps {
  countries: any[]
  initialApplication: any | null
}

export default function WizardLayout({
  countries,
  initialApplication,
}: WizardLayoutProps) {
  const {
    currentStep,
    initializeFromApplication,
    setCurrentStep,
    application,
  } = useOnboardingStore()

  // When true, step components are unmounted. This is the key to the fix:
  // unmounting while we fetch, then remounting, forces useForm to pick up
  // fresh defaultValues from the newly-synced store application.
  const [isFetching, setIsFetching] = useState(true)

  const syncApplication = useCallback(
    async (preserveStep: boolean) => {
      setIsFetching(true)
      try {
        const res = await fetch("/api/onboarding/application", {
          cache: "no-store",
        })
        const json = await res.json()
        const fetched = res.ok ? json.data?.application ?? null : null
        initializeFromApplication(fetched ?? initialApplication, {
          preserveStep,
        })
      } catch {
        initializeFromApplication(initialApplication, { preserveStep })
      } finally {
        setIsFetching(false)
      }
    },
    [initializeFromApplication, initialApplication]
  )

  // Initial mount — derive step from backend data, don't preserve current step
  useEffect(() => {
    syncApplication(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Go back to a previous step.
   * 1. Switch the step immediately so the URL/title reflects intent.
   * 2. Re-fetch the application (isFetching=true unmounts the step component).
   * 3. When fetch completes (isFetching=false) the step remounts and
   *    useForm picks up the latest defaultValues — form is always populated.
   */
  const handleStepBack = useCallback(
    async (targetStep: "business-details" | "documents") => {
      setCurrentStep(targetStep)
      await syncApplication(true) // preserveStep=true keeps targetStep
    },
    [syncApplication, setCurrentStep]
  )

  // Full-screen loader on initial mount
  if (isFetching && !application) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // While re-fetching (back navigation): unmount the step so it remounts fresh
  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  switch (currentStep) {
    case "business-details":
      return (
        <BusinessDetailsStep
          countries={countries}
          onSuccess={() => setCurrentStep("documents")}
        />
      )

    case "documents":
      return (
        <DocumentsStep
          onNext={() => setCurrentStep("review")}
          onBack={() => handleStepBack("business-details")}
        />
      )

    case "review":
      return (
        <ReviewStep
          onBack={() => handleStepBack("documents")}
          onEdit={(step) =>
            handleStepBack(step as "business-details" | "documents")
          }
        />
      )

    default:
      return null
  }
}