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
  /**
   * Sync store with the latest application from the backend.
   * Pass `preserveStep: true` when you want to keep the user on the
   * current step (e.g. after a re-fetch triggered by Back navigation).
   */
  initializeFromApplication: (
    application: VendorApplication | null,
    options?: { preserveStep?: boolean; forceStep?: OnboardingStep }
  ) => void
  markStepComplete: (step: OnboardingStep) => void
  clear: () => void
}

function deriveStep(application: VendorApplication): OnboardingStep {
  if (application.status === VendorApplicationStatus.SUBMITTED) {
    return "review"
  }
  if (!application.legalBusinessName) {
    return "business-details"
  }
  if (!application.documents || application.documents.length === 0) {
    return "documents"
  }
  return "review"
}

function deriveCompletedSteps(application: VendorApplication): OnboardingStep[] {
  const completed: OnboardingStep[] = []
  if (application.legalBusinessName) completed.push("business-details")
  if (application.documents?.length > 0) completed.push("documents")
  return completed
}

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
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

  initializeFromApplication: (application, options = {}) => {
    if (!application) {
      set({
        application: null,
        currentStep: "business-details",
        completedSteps: [],
      })
      return
    }

    const completed = deriveCompletedSteps(application)

    // If caller wants to force a specific step (e.g. after Back), honour it.
    // If caller wants to preserve the step the user is on, keep it.
    // Otherwise, derive the natural next step from data.
    let nextStep: OnboardingStep

    if (options.forceStep) {
      nextStep = options.forceStep
    } else if (options.preserveStep) {
      nextStep = get().currentStep
    } else {
      nextStep = deriveStep(application)
    }

    set({
      application,
      completedSteps: completed,
      currentStep: nextStep,
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