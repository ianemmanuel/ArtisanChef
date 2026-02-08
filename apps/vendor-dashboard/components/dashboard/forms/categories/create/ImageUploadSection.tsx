"use client"

import { Button } from "@repo/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@repo/ui/components/form"
import { Separator } from "@repo/ui/components/separator"
import { ImageIcon, Upload } from "lucide-react"
import { ChangeEvent, useEffect, useRef } from "react"
import Image from "next/image"


export default function ImageUploadSection({ 
  form, 
  isSubmitting, 
  mainImageFile, 
  mainImageUrl, 
  galleryFiles, 
  galleryUrls, 
  onMainImageChange, 
  onGalleryChange, 
  onRemoveMainImage, 
  onRemoveGalleryImage 
}: { 
  form: any
  isSubmitting: boolean
  mainImageFile: File | null
  mainImageUrl: string
  galleryFiles: File[]
  galleryUrls: string[]
  onMainImageChange: (e: ChangeEvent<HTMLInputElement>) => void
  onGalleryChange: (e: ChangeEvent<HTMLInputElement>) => void
  onRemoveMainImage: () => void
  onRemoveGalleryImage: (index: number) => void
}) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Cleanup object URLs when component unmounts or images change
  useEffect(() => {
    return () => {
      if (mainImageUrl) {
        URL.revokeObjectURL(mainImageUrl)
      }
      galleryUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [mainImageUrl, galleryUrls])

  return (
    <Card className="border shadow-sm dark:border-muted">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <ImageIcon className="w-5 h-5" />
          Category Images
        </CardTitle>
        <CardDescription className="text-base">
          Upload main image and gallery images for the category
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Main Image */}
        <FormField
          control={form.control}
          name="mainImage"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold">Main Image *</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={onMainImageChange}
                      className="hidden"
                      disabled={isSubmitting}
                    />
                    <div className="flex-1">
                      <div className="h-12 px-3 py-2 border border-input bg-background rounded-md flex items-center text-sm text-muted-foreground">
                        {mainImageFile ? mainImageFile.name : "No main image selected"}
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="h-12 px-4"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isSubmitting}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {mainImageFile ? 'Change' : 'Upload'}
                    </Button>
                  </div>
                  
                  {mainImageUrl && (
                    <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden border-2 border-dashed border-muted">
                      <Image
                        src={mainImageUrl}
                        alt="Main category preview"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 h-6 w-6 p-0"
                        onClick={onRemoveMainImage}
                        disabled={isSubmitting}
                      >
                        ×
                      </Button>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Main image representing the category (max 5MB)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        {/* Gallery Images */}
        <FormField
          control={form.control}
          name="gallery"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold">Gallery Images</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={onGalleryChange}
                      className="hidden"
                      disabled={isSubmitting}
                    />
                    <div className="flex-1">
                      <div className="h-12 px-3 py-2 border border-input bg-background rounded-md flex items-center text-sm text-muted-foreground">
                        {galleryFiles.length > 0 
                          ? `${galleryFiles.length} image(s) selected` 
                          : "No gallery images selected"
                        }
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="h-12 px-4"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={isSubmitting || galleryFiles.length >= 5}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Add to Gallery
                    </Button>
                  </div>
                  
                  {galleryUrls.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {galleryUrls.map((url, index) => (
                        <div key={index} className="relative aspect-square bg-muted rounded-lg overflow-hidden border border-muted">
                          <Image
                            src={url}
                            alt={`Gallery image ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 h-5 w-5 p-0"
                            onClick={() => onRemoveGalleryImage(index)}
                            disabled={isSubmitting}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Additional images for the category gallery (max 5 images, 5MB each)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}