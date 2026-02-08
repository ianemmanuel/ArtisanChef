import { FormControl, FormField, FormItem, FormLabel, FormDescription } from '@repo/ui/components/form';
import { Checkbox } from '@repo/ui/components/checkbox';

interface TimeRestrictionToggleProps {
  control: any;
}

export function TimeRestrictionToggle({ control }: TimeRestrictionToggleProps) {
  return (
    <FormField
      control={control}
      name="hasTimeRange"
      render={({ field }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
          <FormControl>
            <Checkbox
              checked={field.value || false}
              onCheckedChange={field.onChange} // Only update form field
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>
              ⏰ Add specific time range
            </FormLabel>
            <FormDescription>
              Set specific hours when the meal is available during the selected dates
            </FormDescription>
          </div>
        </FormItem>
      )}
    />
  );
}