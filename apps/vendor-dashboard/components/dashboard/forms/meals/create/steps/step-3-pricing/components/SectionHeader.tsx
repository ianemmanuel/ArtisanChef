import { Button } from '@repo/ui/components/button';

interface SectionHeaderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  buttonText?: string;
  onButtonClick?: () => void;
}

export function SectionHeader({
  title,
  description,
  icon,
  buttonText,
  onButtonClick
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {buttonText && (
        <Button type="button" onClick={onButtonClick} size="sm">
          {buttonText}
        </Button>
      )}
    </div>
  );
}