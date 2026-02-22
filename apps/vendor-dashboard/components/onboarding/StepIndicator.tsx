"use client"

import { usePathname } from "next/navigation"
import type { Application } from "@/lib/api"
import { StepItem, type StepStatus } from "./StepItem"

interface Props {
  application: Application | null
}

const STEPS = [
  { label: "Business Details", href: "/onboarding/business-details" },
  { label: "Documents", href: "/onboarding/documents" },
  { label: "Review & Submit", href: "/onboarding/review" },
] as const

function getStepStatuses(
  application: Application | null,
  pathname: string
): StepStatus[] {
  const currentIndex = STEPS.findIndex((step) =>
    pathname.startsWith(step.href)
  )

  return STEPS.map((_, index) => {
    if (index === 0) {
      if (currentIndex === 0) return "active"
      if (application) return "complete"
      return "upcoming"
    }

    if (!application) return "locked"

    if (currentIndex === index) return "active"
    if (currentIndex > index) return "complete"

    return "upcoming"
  })
}

export function OnboardingStepIndicator({ application }: Props) {
  const pathname = usePathname()
  const statuses = getStepStatuses(application, pathname)

  return (
    <nav aria-label="Onboarding steps">
      <ol className="flex items-center">
        {STEPS.map((step, index) => {
          const status = statuses[index]
          const isLast = index === STEPS.length - 1

          return (
            <li
              key={step.href}
              className="flex items-center flex-1 last:flex-none"
            >
              <StepItem
                index={index}
                label={step.label}
                href={step.href}
                status={status}
              />

              {/* Connector */}
              {!isLast && (
                <div className="flex-1 mx-3">
                  <div
                    className={`h-px transition-colors ${
                      status === "complete"
                        ? "bg-orange-300"
                        : "bg-stone-200"
                    }`}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}