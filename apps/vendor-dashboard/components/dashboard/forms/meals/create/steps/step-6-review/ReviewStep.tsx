// ReviewStep.tsx - FIXED VERSION

'use client'
import {
  useDiscount,
  usePrepareSubmissionData,
  useResetWizard,
  useSetCurrentStep,
} from '@/lib/state/meal-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/card'
import { Button } from '@repo/ui/components/button'
import { DollarSign, Calendar, Tag, Image as ImageIcon, Loader2 } from 'lucide-react'
import { CardSection } from './components/CardSection'
import { BasicInfoSection } from './components/BasicInfoSection'
import { AvailabilitySection } from './components/AvailabilitySection'
import { PricingSection } from './components/PricingSection'
import { DiscountSection } from './components/DiscountSection'
import { MediaSection } from './components/MediaSection'
import { PricingEconomicsSection } from './components/PricingEconomicsSection'
import { useMealSubmission } from '@/hooks/useMealSubmission'

interface ReviewStepProps {
  onBack: () => void
}

export function ReviewStep({ onBack }: ReviewStepProps) {
  const discount = useDiscount()
  const prepareSubmissionData = usePrepareSubmissionData() // This gets the function
  const resetWizard = useResetWizard()
  const setCurrentStep = useSetCurrentStep()
  const mealSubmissionMutation = useMealSubmission()

  const handleSubmit = async () => {
    try {
      console.log('🔍 [ReviewStep] Starting submission...')
      
      // FIX: Call the function to get the actual data
      const submissionData = prepareSubmissionData() // ✅ Call the function!
      
      console.log('🔍 [ReviewStep] Submission data:', submissionData)
      console.log('🔍 [ReviewStep] basicInfo check:', submissionData.basicInfo)
      console.log('🔍 [ReviewStep] mealName check:', submissionData.basicInfo?.mealName)
      
      // Validate before submission
      if (!submissionData.basicInfo?.mealName) {
        console.error('❌ [ReviewStep] Invalid submission data:', submissionData)
        alert('Please ensure all required fields are filled')
        return
      }

      await mealSubmissionMutation.mutateAsync(submissionData)
      
      console.log('✅ [ReviewStep] Submission successful')
      resetWizard()
      setCurrentStep(1)
    } catch (err) {
      console.error('❌ [ReviewStep] Submission error:', err)
      // You might want to show a toast notification here
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">👀 Review & Submit</CardTitle>
        <CardDescription>Almost done! Review your meal details and submit to your platform</CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        <CardSection title="🍽️ Basic Information"><BasicInfoSection /></CardSection>
        <CardSection title="Availability" icon={<Calendar className="h-5 w-5" />}><AvailabilitySection /></CardSection>
        <CardSection title="Pricing & Variants" icon={<DollarSign className="h-5 w-5" />}><PricingSection /></CardSection>
        {discount && <CardSection title="Discount Offer" icon={<Tag className="h-5 w-5" />}><DiscountSection /></CardSection>}
        <CardSection title="Media & Visuals" icon={<ImageIcon className="h-5 w-5" />}><MediaSection /></CardSection>
        <CardSection title="📊 Pricing Economics" showSeparator={false}><PricingEconomicsSection /></CardSection>

        <div className="flex justify-between pt-6">
          <Button type="button" variant="outline" onClick={onBack} size="lg" disabled={mealSubmissionMutation.isPending}>← Back</Button>
          <Button onClick={handleSubmit} size="lg" disabled={mealSubmissionMutation.isPending}>
            {mealSubmissionMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Meal...</> : <>🚀 Submit Meal</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}