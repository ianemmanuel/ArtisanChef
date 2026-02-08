import Image from 'next/image'
import { Button } from '@repo/ui/components/button'
import { Badge } from '@repo/ui/components/badge'
import { X, Loader2 } from 'lucide-react'
import { useImageUrl } from '@/hooks/use-image-url'

interface ImageGridProps {
  imageIds: string[];
  onRemove: (index: number) => void;
}

export function ImageGrid({ imageIds, onRemove }: ImageGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {imageIds.map((imageId, index) => (
        <ImageGridItem
          key={imageId}
          imageId={imageId}
          index={index}
          onRemove={() => onRemove(index)}
        />
      ))}
    </div>
  )
}

function ImageGridItem({ imageId, index, onRemove }: { imageId: string; index: number; onRemove: () => void }) {
  const { imageUrl, loading, error } = useImageUrl(imageId)

  return (
    <div className="relative group">
      {loading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center rounded-lg">
          <p className="text-destructive text-xs">Failed to load</p>
        </div>
      )}
      <div className="relative w-full h-32 rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
        <Image
          src={imageUrl || '/placeholder-image.jpg'}
          alt={`Gallery image ${index + 1}`}
          fill
          className="object-cover"
          sizes="150px"
        />
      </div>
      <Button
        type="button"
        size="icon"
        variant="destructive"
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
      <Badge variant="secondary" className="absolute bottom-1 left-1 text-xs">
        {index + 1}
      </Badge>
    </div>
  )
}
