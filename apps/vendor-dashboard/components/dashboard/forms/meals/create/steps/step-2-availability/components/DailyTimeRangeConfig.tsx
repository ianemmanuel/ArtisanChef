import { TimeRangeInputs } from './TimeRangeInputs';

interface DailyTimeRangeConfigProps {
  control: any;
}

export function DailyTimeRangeConfig({ control }: DailyTimeRangeConfigProps) {
  return (
    <div className="space-y-4">
      <TimeRangeInputs
        control={control}
        startName="startTime"
        endName="endTime"
        startLabel="🕐 Start Time"
        endLabel="🕐 End Time"
      />
    </div>
  );
}