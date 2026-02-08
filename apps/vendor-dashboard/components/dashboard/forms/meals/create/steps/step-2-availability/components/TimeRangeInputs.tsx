import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';

interface TimeRangeInputsProps {
  control: any;
  startName: string;
  endName: string;
  startLabel: string;
  endLabel: string;
  onStartTimeChange?: (value: string) => void;
  onEndTimeChange?: (value: string) => void;
  defaultStartTime?: string;
  defaultEndTime?: string;
}

export function TimeRangeInputs({
  control,
  startName,
  endName,
  startLabel,
  endLabel,
  onStartTimeChange,
  onEndTimeChange,
  defaultStartTime,
  defaultEndTime
}: TimeRangeInputsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={control}
        name={startName}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              {startLabel}
            </FormLabel>
            <FormControl>
              <Input 
                type="time" 
                value={field.value || ''} // Use only value (controlled)
                onChange={(e) => {
                  field.onChange(e.target.value);
                  onStartTimeChange?.(e.target.value);
                }}
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
              {endLabel}
            </FormLabel>
            <FormControl>
              <Input 
                type="time" 
                value={field.value || ''} // Use only value (controlled)
                onChange={(e) => {
                  field.onChange(e.target.value);
                  onEndTimeChange?.(e.target.value);
                }}
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