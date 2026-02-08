import { Button } from '@repo/ui/components/button';
import { Plus, Upload } from 'lucide-react';

interface DragDropZoneProps {
  active: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
  currentCount: number;
  maxCount: number;
}

export function DragDropZone({
  active,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  currentCount,
  maxCount
}: DragDropZoneProps) {
  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        active 
          ? 'border-primary bg-primary/5' 
          : 'border-muted-foreground/25 bg-gradient-to-br from-secondary/5 to-accent/5'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Plus className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground mb-3">
        Add gallery image ({currentCount}/{maxCount})
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onClick}
      >
        <Upload className="mr-2 h-4 w-4" />
        Upload Image
      </Button>
    </div>
  );
}