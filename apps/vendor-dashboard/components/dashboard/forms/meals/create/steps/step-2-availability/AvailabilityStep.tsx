'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { availabilitySchema } from '@/lib/shemas/meal-schema';
import { 
  useAvailability, 
  useUpdateAvailability, 
  useSetCurrentStep,
  useCurrentStep 
} from '@/lib/state/meal-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/card';
import { Form } from '@repo/ui/components/form';
import { Button } from '@repo/ui/components/button';

import { AvailabilityTypeSelector } from './components/AvailabilityTypeSelector';
import { SpecificDaysConfig } from './components/SpecificDaysConfig';
import { DailyTimeRangeConfig } from './components/DailyTimeRangeConfig';
import { CustomScheduleConfig } from './components/CustomScheduleConfig';
import { DateRangeConfig } from './components/DateRangeConfig';

interface AvailabilityStepProps {
  onNext?: () => void;
  onBack?: () => void;
}

// Changed to named export to match the import in MealWizard
export function AvailabilityStep({ onNext, onBack }: AvailabilityStepProps) {
  const availability = useAvailability();
  const updateAvailability = useUpdateAvailability();
  const setCurrentStep = useSetCurrentStep();
  const currentStep = useCurrentStep();
   
  const form = useForm({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      type: availability.type || 'always',
      days: availability.days || [],
      startTime: availability.startTime || '',
      endTime: availability.endTime || '',
      customSchedule: availability.customSchedule || [],
      startDate: availability.startDate || '',
      endDate: availability.endDate || '',
      hasTimeRange: availability.hasTimeRange || false,
      dateRangeStartTime: availability.dateRangeStartTime || '',
      dateRangeEndTime: availability.dateRangeEndTime || ''
    },
  });

  const watchedType = form.watch('type');

  const handleSubmit = (data: typeof availability) => {
    // Update store with form data
    updateAvailability(data);
    
    // Move to next step using store
    setCurrentStep(3); // Move to pricing step
    
    // Call optional callback if provided
    onNext?.();
  };

  const handleBack = () => {
    // Move to previous step using store
    setCurrentStep(currentStep - 1);
    
    // Call optional callback if provided
    onBack?.();
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          📅 Meal Availability
        </CardTitle>
        <CardDescription>
          When will this delicious meal be available for your hungry customers?
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <AvailabilityTypeSelector control={form.control} />

            {watchedType === 'specific-days' && (
              <SpecificDaysConfig control={form.control} />
            )}

            {watchedType === 'specific-times' && (
              <DailyTimeRangeConfig control={form.control} />
            )}

            {watchedType === 'specific-days-times' && (
              <CustomScheduleConfig control={form.control} />
            )}

            {watchedType === 'custom-date-range' && (
              <DateRangeConfig control={form.control} />
            )}

            <div className="flex justify-between pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleBack}
                size="lg"
                className="px-8 py-3"
              >
                ← Back
              </Button>
              <Button 
                type="submit" 
                size="lg"
                className="px-8 py-3 transition-all duration-200 hover:scale-105"
              >
                Next: Set Pricing 💰
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default AvailabilityStep;