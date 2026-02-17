"use client"

import { Check } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { OnboardingStep } from "@/lib/state/onboarding-store"

interface Step {
  id: OnboardingStep
  name: string
  description: string
}

const steps: Step[] = [
  {
    id: "business-details",
    name: "Business Details",
    description: "Company information",
  },
  {
    id: "documents",
    name: "Documents",
    description: "Upload required files",
  },
  {
    id: "review",
    name: "Review",
    description: "Confirm and submit",
  },
]

interface StepIndicatorProps {
  currentStep: OnboardingStep
  completedSteps: OnboardingStep[]
  onStepClick?: (step: OnboardingStep) => void
}

export default function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
  const getCurrentStepIndex = () => {
    return steps.findIndex((step) => step.id === currentStep)
  }

  const isStepCompleted = (stepId: OnboardingStep) => {
    return completedSteps.includes(stepId)
  }

  const isStepCurrent = (stepId: OnboardingStep) => {
    return stepId === currentStep
  }

  const isStepClickable = (stepId: OnboardingStep, index: number) => {
    const currentIndex = getCurrentStepIndex()
    // Can click on completed steps or current step
    return isStepCompleted(stepId) || index <= currentIndex
  }

  return (
    <nav aria-label="Progress">
      {/* Mobile - Compact version */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm font-medium">
            Step {getCurrentStepIndex() + 1} of {steps.length}
          </p>
          <p className="text-sm text-muted-foreground">{steps[getCurrentStepIndex()].name}</p>
        </div>
        <div className="flex gap-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "h-2 flex-1 rounded-full transition-colors",
                isStepCompleted(step.id)
                  ? "bg-primary"
                  : isStepCurrent(step.id)
                  ? "bg-primary/50"
                  : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Desktop - Full version */}
      <ol className="hidden md:flex items-center w-full mb-12">
        {steps.map((step, index) => {
          const completed = isStepCompleted(step.id)
          const current = isStepCurrent(step.id)
          const clickable = isStepClickable(step.id, index)

          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center",
                index !== steps.length - 1 ? "flex-1" : "flex-initial"
              )}
            >
              <button
                onClick={() => clickable && onStepClick?.(step.id)}
                disabled={!clickable}
                className={cn(
                  "flex items-center group",
                  clickable && "cursor-pointer hover:opacity-80",
                  !clickable && "cursor-not-allowed opacity-50"
                )}
              >
                <div className="flex items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                      completed
                        ? "border-primary bg-primary text-primary-foreground"
                        : current
                        ? "border-primary bg-background text-primary"
                        : "border-muted bg-background text-muted-foreground"
                    )}
                  >
                    {completed ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <div className="ml-4 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        completed || current ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step.name}
                    </p>
                    <p className="text-sm text-muted-foreground hidden lg:block">
                      {step.description}
                    </p>
                  </div>
                </div>
              </button>

              {/* Connector line */}
              {index !== steps.length - 1 && (
                <div
                  className={cn(
                    "ml-4 h-0.5 flex-1 transition-colors",
                    completed ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}