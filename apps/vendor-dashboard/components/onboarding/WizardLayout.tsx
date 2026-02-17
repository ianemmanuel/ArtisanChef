"use client"

import { useEffect } from "react"
import { useOnboardingStore } from "@/lib/state/onboarding-store"
import BusinessDetailsStep from "./BusinessDetailsStep"
import DocumentsStep from "./DocumentsStep"
import ReviewStep from "./ReviewStep"

interface WizardLayoutProps {
  countries: any[]
  vendorTypes: any[]
  initialApplication: any | null
}

export default function WizardLayout({
  countries,
  vendorTypes,
  initialApplication,
}: WizardLayoutProps) {
  const {
    currentStep,
    initializeFromApplication,
    setCurrentStep,
  } = useOnboardingStore()

  //**Initialize wizard state from server application
  
  useEffect(() => {
    initializeFromApplication(initialApplication)
  }, [initialApplication, initializeFromApplication])

  const renderStep = () => {
    switch (currentStep) {
      case "business-details":
        return (
          <BusinessDetailsStep
            countries={countries}
            vendorTypes={vendorTypes}
            onSuccess={() => setCurrentStep("documents")}
          />
        )

      case "documents":
        return (
          <DocumentsStep
            onSuccess={() => setCurrentStep("review")}
            onBack={() => setCurrentStep("business-details")}
          />
        )

      case "review":
        return (
          <ReviewStep
            onBack={() => setCurrentStep("documents")}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="wizard-layout space-y-8">
      {renderStep()}
    </div>
  )
}
