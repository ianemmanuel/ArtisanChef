import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';

interface DateRangeInputsProps {
  control: any;
  startName: string;
  endName: string;
}

export function DateRangeInputs({
  control,
  startName,
  endName
}: DateRangeInputsProps) {

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={control}
        name={startName}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              📅 Start Date
            </FormLabel>
            <FormControl>
              <Input 
                type="date"
                value={field.value || ''} // Use only value (controlled)
                onChange={field.onChange} // Use field.onChange directly
                className="transition-all duration-200 focus:scale-[1.02]"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={control}
        name={endName}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              📅 End Date
            </FormLabel>
            <FormControl>
              <Input 
                type="date" 
                value={field.value || ''} // Use only value (controlled)
                onChange={field.onChange} // Use field.onChange directly
                className="transition-all duration-200 focus:scale-[1.02]"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}