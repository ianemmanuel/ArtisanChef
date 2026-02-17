import { create } from "zustand"
import { VendorApplication, VendorApplicationStatus, VendorDocument } from "@repo/types"

export type OnboardingStep = "business-details" | "documents" | "review"

interface OnboardingStore {
  currentStep: OnboardingStep
  completedSteps: OnboardingStep[]
  application: VendorApplication | null

  setCurrentStep: (step: OnboardingStep) => void
  setApplication: (application: VendorApplication | null) => void
  updateApplicationDocuments: (documents: VendorDocument[]) => void
  initializeFromApplication: (application: VendorApplication | null) => void
  markStepComplete: (step: OnboardingStep) => void
  clear: () => void
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  currentStep: "business-details",
  completedSteps: [],
  application: null,

  setCurrentStep: (step) => set({ currentStep: step }),

  setApplication: (application) => set({ application }),

  updateApplicationDocuments: (documents) =>
    set((state) =>
      state.application
        ? { application: { ...state.application, documents } }
        : {}
    ),

  initializeFromApplication: (application) => {
    if (!application) {
      set({
        application: null,
        currentStep: "business-details",
        completedSteps: [],
      })
      return
    }

    const completed: OnboardingStep[] = []

    if (application.legalBusinessName) {
      completed.push("business-details")
    }

    if (application.documents?.length > 0) {
      completed.push("documents")
    }

    let currentStep: OnboardingStep = "business-details"

    if (application.status === VendorApplicationStatus.SUBMITTED) {
      currentStep = "review"
    } else if (!completed.includes("business-details")) {
      currentStep = "business-details"
    } else if (!completed.includes("documents")) {
      currentStep = "documents"
    } else {
      currentStep = "review"
    }

    set({
      application,
      completedSteps: completed,
      currentStep,
    })
  },

  markStepComplete: (step) =>
    set((state) => ({
      completedSteps: state.completedSteps.includes(step)
        ? state.completedSteps
        : [...state.completedSteps, step],
    })),

  clear: () =>
    set({
      currentStep: "business-details",
      completedSteps: [],
      application: null,
    }),
}))
