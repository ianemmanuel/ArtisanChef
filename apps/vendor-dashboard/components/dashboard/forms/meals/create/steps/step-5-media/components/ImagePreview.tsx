import Image from 'next/image'
import { Button } from '@repo/ui/components/button'
import { Badge } from '@repo/ui/components/badge'
import { X } from 'lucide-react'

interface ImagePreviewProps {
  src: string | null;
  onRemove: () => void;
  badgeLabel?: string;
  className?: string;
}

export function ImagePreview({
  src,
  onRemove,
  badgeLabel,
  className = ''
}: ImagePreviewProps) {
  // Don't render if src is empty, null, or invalid
  if (!src || src.trim() === '') {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative w-full h-64 rounded-lg overflow-hidden shadow-md">
        <Image
          src={src}
          alt="Preview"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <Button
        type="button"
        size="icon"
        variant="destructive"
        className="absolute top-2 right-2 z-10"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
      {badgeLabel && (
        <Badge className="absolute bottom-2 left-2 bg-primary z-10">
          {badgeLabel}
        </Badge>
      )}
    </div>
  );
}