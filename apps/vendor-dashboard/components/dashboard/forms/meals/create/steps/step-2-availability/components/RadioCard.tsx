import { RadioGroupItem } from '@repo/ui/components/radio-group';
import { Label } from '@repo/ui/components/label';

interface RadioCardProps {
  value: string;
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
}

export function RadioCard({
  value,
  id,
  title,
  description,
  icon,
  className = ''
}: RadioCardProps) {
  return (
    <div className={`flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/50 transition-all duration-200 hover:scale-[1.02] ${className}`}>
      <RadioGroupItem value={value} id={id} />
      <Label htmlFor={id} className="flex-1 cursor-pointer">
        <div className="font-medium flex items-center gap-2">
          {icon}
          {title}
        </div>
        <div className="text-sm text-muted-foreground">
          {description}
        </div>
      </Label>
    </div>
  );
}