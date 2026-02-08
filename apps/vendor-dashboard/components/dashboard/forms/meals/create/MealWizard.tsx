'use client'

import { WizardProgress } from './WizardProgress'
import { BasicInfoStep } from './steps/step-1-basicinfo/BasicInfoStep'
import { AvailabilityStep } from './steps/step-2-availability/AvailabilityStep'
import { PricingStep } from './steps/step-3-pricing/PricingStep'
import { DiscountsStep } from './steps/step-4-discounts/DiscountsStep'
import { MediaStep } from './steps/step-5-media/MediaStep'
import { ReviewStep } from './steps/step-6-review/ReviewStep'
import { Button } from '@repo/ui/components/button'
import { Card, CardContent } from '@repo/ui/components/card'
import { AlertCircle, RotateCcw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { 
  useCurrentStep, 
  useSetCurrentStep, 
  useResetWizard, 
  useIsStepValid,
  useClearAllImages
} from '@/lib/state/meal-store'

const TOTAL_STEPS = 6

export function MealWizard() {
  const currentStep = useCurrentStep()
  const setCurrentStep = useSetCurrentStep()
  const resetWizard = useResetWizard()
  const clearAllImages = useClearAllImages()
  const isCurrentStepValid = useIsStepValid(currentStep)

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS && isCurrentStepValid) {
      setCurrentStep(currentStep + 1)
      toast.success('Progress saved!', {
        description: 'Your data has been saved',
      })
    } else if (!isCurrentStepValid) {
      toast.error('Please complete all required fields', {
        description: 'Some required information is missing.',
      })
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleReset = async () => {
    // Clear images from IndexedDB before resetting
    await clearAllImages()
    resetWizard()
    toast.success('Form reset!', {
      description: 'All data has been cleared.',
    })
  }

  const handleSaveDraft = () => {
    toast.success('Draft saved!', {
      description: 'Your progress has been saved for later.',
    })
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <BasicInfoStep onNext={handleNext} />
      case 2:
        return <AvailabilityStep onNext={handleNext} onBack={handleBack} />
      case 3:
        return <PricingStep onNext={handleNext} onBack={handleBack} />
      case 4:
        return <DiscountsStep onNext={handleNext} onBack={handleBack} />
      case 5:
        return <MediaStep onNext={handleNext} onBack={handleBack} />
      case 6:
        return <ReviewStep onBack={handleBack} />
      default:
        return <BasicInfoStep onNext={handleNext} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-4">
            🍽️ Meal Upload Wizard
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Create and upload your delicious meals to the platform with ease. Follow the step-by-step process to showcase your culinary creations!
          </p>
        </div>

        {/* Progress Indicator */}
        <WizardProgress />

        {/* Action Buttons */}
        <Card className="max-w-4xl mx-auto mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>Data is automatically saved when you proceed to the next step</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Draft
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="flex items-center gap-2 text-destructive hover:text-destructive"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Form
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Step Content */}
        <div className="pb-8">
          {renderCurrentStep()}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
          <p>
            Need help? Our wizard guides you through each step with helpful tips and validation. 
            Your progress is automatically saved, so you can return anytime to complete your meal upload.
          </p>
        </div>
      </div>
    </div>
  )
}