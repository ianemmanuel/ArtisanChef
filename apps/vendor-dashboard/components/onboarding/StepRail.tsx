import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { ONBOARDING_STEPS, stepIndexForState } from "@/lib/onboarding/lifecycle"
import type { VendorLifecycleState } from "@repo/types/vendor-app"

export function StepRail({ state }: { state: VendorLifecycleState }) {
  const activeIndex = stepIndexForState(state)

  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="Onboarding progress">
      {ONBOARDING_STEPS.map((step, index) => {
        const isDone = index < activeIndex
        const isActive = index === activeIndex

        return (
          <li key={step.key} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isDone && "bg-deep text-deep-foreground",
                  isActive && "bg-primary text-primary-foreground",
                  !isDone && !isActive && "bg-muted text-muted-foreground",
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isDone ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:inline",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {index < ONBOARDING_STEPS.length - 1 && (
              <span
                className={cn("h-px flex-1 transition-colors", isDone ? "bg-deep" : "bg-border")}
                aria-hidden
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
