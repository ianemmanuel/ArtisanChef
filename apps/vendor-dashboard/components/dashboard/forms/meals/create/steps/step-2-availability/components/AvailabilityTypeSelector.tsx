import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@repo/ui/components/form';
import { RadioGroup } from '@repo/ui/components/radio-group';
import { RadioCard } from './RadioCard';

interface AvailabilityTypeSelectorProps {
  control: any;
}

export function AvailabilityTypeSelector({ control }: AvailabilityTypeSelectorProps) {
  return (
    <FormField
      control={control}
      name="type"
      render={({ field }) => (
        <FormItem className="space-y-4">
          <FormLabel className="text-lg font-medium">
            Choose availability type:
          </FormLabel>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange} // Only update form field
              value={field.value || 'always'} // Use value instead of defaultValue
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <RadioCard
                value="always"
                id="always"
                title="🌟 Always Available"
                description="Available every day during your restaurant hours"
              />
              
              <RadioCard
                value="specific-days"
                id="specific-days"
                title="🗓️ Specific Days"
                description="Available only on selected days"
              />
              
              <RadioCard
                value="specific-times"
                id="specific-times"
                title="⏰ Specific Times"
                description="Available at specific times every day"
              />
              
              <RadioCard
                value="specific-days-times"
                id="specific-days-times"
                title="📋 Custom Schedule"
                description="Different times for different days"
              />

              <RadioCard
                value="custom-date-range"
                id="custom-date-range"
                title="📅 Custom Date Range"
                description="For limited-time offers, seasonal dishes, or pop-up menus"
                className="md:col-span-2"
              />
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}