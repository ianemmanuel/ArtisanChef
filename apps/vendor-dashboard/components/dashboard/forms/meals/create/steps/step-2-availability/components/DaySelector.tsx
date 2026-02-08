import { Button } from '@repo/ui/components/button';

interface DaySelectorProps {
  days: string[];
  selectedDays: string[];
  onToggleDay: (day: string) => void;
}

export function DaySelector({
  days,
  selectedDays,
  onToggleDay
}: DaySelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
      {days.map((day) => {
        const isSelected = selectedDays.includes(day);
        return (
          <Button
            key={day}
            type="button"
            variant={isSelected ? "default" : "outline"}
            onClick={() => onToggleDay(day)}
            className="justify-start transition-all duration-200 hover:scale-[1.02]"
          >
            {day}
          </Button>
        );
      })}
    </div>
  );
}