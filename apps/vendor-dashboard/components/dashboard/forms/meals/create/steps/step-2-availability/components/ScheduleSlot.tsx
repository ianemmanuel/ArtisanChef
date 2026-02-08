import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/select';
import { Trash2 } from 'lucide-react';

interface ScheduleSlotProps {
  day: string;
  startTime: string;
  endTime: string;
  onDayChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onRemove: () => void;
}

const daysOfWeek = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export function ScheduleSlot({
  day,
  startTime,
  endTime,
  onDayChange,
  onStartTimeChange,
  onEndTimeChange,
  onRemove
}: ScheduleSlotProps) {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg transition-all duration-200 hover:shadow-md">
      <div className="flex-1">
        <Select value={day} onValueChange={onDayChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select Day" />
          </SelectTrigger>
          <SelectContent>
            {daysOfWeek.map(dayOption => (
              <SelectItem key={dayOption} value={dayOption}>
                {dayOption}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Input
        type="time"
        value={startTime}
        onChange={(e) => onStartTimeChange(e.target.value)}
        className="flex-1 transition-all duration-200 focus:scale-[1.02]"
        placeholder="Start time"
      />
      
      <Input
        type="time"
        value={endTime}
        onChange={(e) => onEndTimeChange(e.target.value)}
        className="flex-1 transition-all duration-200 focus:scale-[1.02]"
        placeholder="End time"
      />
      
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onRemove}
        className="transition-all duration-200 hover:scale-110 hover:bg-destructive hover:text-destructive-foreground"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}