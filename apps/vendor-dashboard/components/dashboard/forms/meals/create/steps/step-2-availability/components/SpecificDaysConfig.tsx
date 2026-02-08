// Example: Simplified SpecificDaysConfig.tsx
import { FormField, FormItem, FormLabel, FormDescription, FormMessage } from '@repo/ui/components/form';
import { DaySelector } from './DaySelector';

const daysOfWeek = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

interface SpecificDaysConfigProps {
  control: any;
}

export function SpecificDaysConfig({ control }: SpecificDaysConfigProps) {
  return (
    <FormField
      control={control}
      name="days"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            📆 Select Days
          </FormLabel>
          <FormDescription>
            Choose which days of the week this meal will be available
          </FormDescription>
          <DaySelector
            days={daysOfWeek}
            selectedDays={field.value || []}
            onToggleDay={(day) => {
              const currentDays = field.value || [];
              const updatedDays = currentDays.includes(day)
                ? currentDays.filter(d => d !== day)
                : [...currentDays, day];
              
              // Only update form field - store update happens on form submit
              field.onChange(updatedDays);
            }}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}