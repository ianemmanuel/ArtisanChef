'use client'

import Image from 'next/image'
import { Video } from 'lucide-react'
import { useMedia } from '@/lib/state/meal-store'
import { useImageUrl } from '@/hooks/use-image-url'

function GalleryImage({ imageId, index }: { imageId: string; index: number }) {
  const { imageUrl, loading } = useImageUrl(imageId)

  if (loading) {
    return (
      <div className="w-full h-20 bg-muted rounded flex items-center justify-center">
        <div className="animate-pulse bg-muted-foreground/20 h-4 w-4 rounded-full" />
      </div>
    )
  }

  if (!imageUrl) return null

  return (
    <div className="relative w-full h-20 rounded overflow-hidden">
      <Image
        src={imageUrl}
        alt={`Gallery image ${index + 1}`}
        fill
        className="object-cover rounded"
        sizes="100px"
      />
    </div>
  )
}

export function MediaGallery() {
  const media = useMedia() || { mainImage: '', gallery: [], videoUrl: '' }
  const { mainImage, gallery, videoUrl } = media

  const { imageUrl: mainImageUrl, loading: mainImageLoading } = useImageUrl(mainImage)

  const hasContent = mainImage || (gallery?.length > 0) || videoUrl
  if (!hasContent) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {mainImage && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">Main Image</p>
          {mainImageLoading ? (
            <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
              <div className="animate-pulse bg-muted-foreground/20 h-8 w-8 rounded-full" />
            </div>
          ) : mainImageUrl ? (
            <div className="relative w-full h-48 rounded-lg overflow-hidden shadow-md">
              <Image
                src={mainImageUrl}
                alt="Main meal image"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          ) : null}
        </div>
      )}
      
      {gallery?.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Gallery ({gallery.length} images)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {gallery.slice(0, 4).map((imageId, index) => (
              <GalleryImage key={imageId} imageId={imageId} index={index} />
            ))}
            {gallery.length > 4 && (
              <div className="w-full h-20 bg-muted rounded flex items-center justify-center text-sm">
                +{gallery.length - 4} more
              </div>
            )}
          </div>
        </div>
      )}
      
      {videoUrl && (
        <div>
          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
            <Video className="h-4 w-4" />
            Video URL
          </p>
          <p className="text-sm font-mono bg-muted p-2 rounded break-all">
            {videoUrl}
          </p>
        </div>
      )}
    </div>
  )
}
