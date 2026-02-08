import { DateRangeInputs } from './DateRangeInputs';
import { TimeRestrictionToggle } from './TimeRestrictionToggle';
import { TimeRangeInputs } from './TimeRangeInputs';
import { useWatch } from 'react-hook-form';

interface DateRangeConfigProps {
  control: any;
}

export function DateRangeConfig({ control }: DateRangeConfigProps) {
  // Watch the hasTimeRange field from the form instead of store
  const hasTimeRange = useWatch({
    control,
    name: 'hasTimeRange',
    defaultValue: false
  });

  return (
    <div className="space-y-6">
      <DateRangeInputs
        control={control}
        startName="startDate"
        endName="endDate"
      />
      
      <TimeRestrictionToggle control={control} />
      
      {hasTimeRange && (
        <TimeRangeInputs
          control={control}
          startName="dateRangeStartTime"
          endName="dateRangeEndTime"
          startLabel="🕐 Start Time"
          endLabel="🕐 End Time"
        />
      )}
    </div>
  );
}