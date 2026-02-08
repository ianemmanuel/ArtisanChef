'use client'

import { Check } from 'lucide-react'
import { cn } from '@repo/ui/lib/utils'
import { useCurrentStep } from '@/lib/state/meal-store'

const TOTAL_STEPS = 6

const stepLabels = [
  'Basic Info',
  'Availability', 
  'Pricing',
  'Discounts',
  'Media',
  'Review'
]

const stepEmojis = ['📝', '📅', '💰', '🏷️', '📸', '👀']

export function WizardProgress() {
  const currentStep = useCurrentStep()

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {Array.from({ length: TOTAL_STEPS }, (_, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          
          return (
            <div key={stepNumber} className="flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                  isCompleted && 'bg-primary border-primary text-primary-foreground',
                  isCurrent && 'border-primary bg-primary/10 text-primary',
                  !isCompleted && !isCurrent && 'border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-lg">{stepEmojis[index]}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <p className={cn(
                  'text-xs font-medium hidden sm:block',
                  isCurrent && 'text-primary',
                  isCompleted && 'text-primary',
                  !isCompleted && !isCurrent && 'text-muted-foreground'
                )}>
                  {stepLabels[index]}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Step {stepNumber}
                </p>
              </div>

              {/* Connector Line */}
              {stepNumber < TOTAL_STEPS && (
                <div className="absolute left-full top-5 w-full h-0.5 -translate-y-1/2 -z-10">
                  <div
                    className={cn(
                      'h-full transition-all duration-300',
                      isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                  />
                </div>
              )}
            </div>
          )
        }).map((stepElement, index) => (
          <div key={index} className="relative flex-1 flex justify-center">
            {stepElement}
          </div>
        ))}
      </div>
    </div>
  )
}