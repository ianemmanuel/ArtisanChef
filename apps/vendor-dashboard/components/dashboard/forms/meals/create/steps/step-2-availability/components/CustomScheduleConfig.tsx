import { FormField, FormItem, FormLabel, FormDescription, FormMessage } from '@repo/ui/components/form';
import { Button } from '@repo/ui/components/button';
import { Plus } from 'lucide-react';
import { ScheduleSlot } from './ScheduleSlot';

interface CustomScheduleConfigProps {
  control: any;
}

export function CustomScheduleConfig({ control }: CustomScheduleConfigProps) {
  return (
    <FormField
      control={control}
      name="customSchedule"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            📋 Custom Schedule
          </FormLabel>
          <FormDescription>
            Set different availability times for different days
          </FormDescription>
          <div className="space-y-4">
            {(field.value || []).map((schedule: any, index: number) => (
              <ScheduleSlot
                key={index}
                day={schedule.day}
                startTime={schedule.startTime}
                endTime={schedule.endTime}
                onDayChange={(value) => {
                  const updated = [...(field.value || [])];
                  updated[index] = { ...updated[index], day: value };
                  field.onChange(updated); // Only update form field
                }}
                onStartTimeChange={(value) => {
                  const updated = [...(field.value || [])];
                  updated[index] = { ...updated[index], startTime: value };
                  field.onChange(updated); // Only update form field
                }}
                onEndTimeChange={(value) => {
                  const updated = [...(field.value || [])];
                  updated[index] = { ...updated[index], endTime: value };
                  field.onChange(updated); // Only update form field
                }}
                onRemove={() => {
                  const updated = (field.value || []).filter((_: any, i: number) => i !== index);
                  field.onChange(updated); // Only update form field
                }}
              />
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const current = field.value || [];
                const updated = [
                  ...current,
                  { day: '', startTime: '', endTime: '' }
                ];
                field.onChange(updated); // Only update form field
              }}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Time Slot
            </Button>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}