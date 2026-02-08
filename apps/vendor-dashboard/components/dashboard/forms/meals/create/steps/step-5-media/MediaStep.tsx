'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { mediaSchema } from '@/lib/shemas/meal-schema';
import { useMedia, useUpdateMedia, useAddGalleryImage, useRemoveImage } from '@/lib/state/meal-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import { Form, FormField, FormItem, FormLabel, FormDescription, FormMessage } from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import { Image, Video, Camera } from 'lucide-react';
import { MainImageUploader } from './components/MainimageUploader';
import { ImageGrid } from './components/ImageGrid';
import { GalleryManager } from './components/GalleryManager';

interface MediaStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function MediaStep({ onNext, onBack }: MediaStepProps) {
  const media = useMedia();
  const updateMedia = useUpdateMedia();
  const removeImage = useRemoveImage();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const form = useForm({
    resolver: zodResolver(mediaSchema),
    defaultValues: media,
  });

  const onSubmit = (data: any) => {
    updateMedia(data);
    onNext();
  };

  const handleGalleryAdd = async (imageId: string) => {
    const currentGallery = form.getValues('gallery') || [];
    const updatedGallery = [...currentGallery, imageId];
    form.setValue('gallery', updatedGallery);
    
    updateMedia({
      ...media,
      gallery: updatedGallery
    });
  };

  const handleGalleryRemove = async (index: number) => {
    const currentGallery = form.getValues('gallery') || [];
    const imageIdToRemove = currentGallery[index];
    
    await removeImage(imageIdToRemove);
    
    const updatedGallery = currentGallery.filter((_, i) => i !== index);
    form.setValue('gallery', updatedGallery);
    
    updateMedia({
      ...media,
      gallery: updatedGallery
    });
  };

  const handleVideoUrlChange = (value: string) => {
    form.setValue('videoUrl', value);
    updateMedia({
      ...media,
      videoUrl: value
    });
  };

  const gallery = form.watch('gallery') || [];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          📸 Media & Visuals
        </CardTitle>
        <CardDescription>
          Show off your delicious meal with mouth-watering photos and videos!
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Main Image */}
            <FormField
              control={form.control}
              name="mainImage"
              render={() => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-lg">
                    <Camera className="h-5 w-5" />
                    Main Image * (Hero Photo)
                  </FormLabel>
                  <FormDescription>
                    This will be the primary image customers see first.
                  </FormDescription>
                  <MainImageUploader
                    value={form.watch('mainImage')}
                    onChange={(value) => form.setValue('mainImage', value)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Gallery */}
            <FormField
              control={form.control}
              name="gallery"
              render={() => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-lg">
                    <Image className="h-5 w-5" />
                    Gallery Images (Optional)
                  </FormLabel>
                  <FormDescription>
                    Add up to 5 additional images
                  </FormDescription>

                  <div className="space-y-4">
                    <GalleryManager
                      imageIds={gallery}
                      maxImages={5}
                      onAdd={handleGalleryAdd}
                      onRemove={handleGalleryRemove}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Video URL */}
            <FormField
              control={form.control}
              name="videoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-lg">
                    <Video className="h-5 w-5" />
                    Video URL (Optional)
                  </FormLabel>
                  <FormDescription>
                    Link to a video on YouTube, TikTok, or other platforms
                  </FormDescription>
                  <div className="relative">
                    <Video className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="https://youtube.com/watch?v=..."
                      className="pl-10"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleVideoUrlChange(e.target.value);
                      }}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-6">
              <Button type="button" variant="outline" onClick={onBack} size="lg">
                ← Back
              </Button>
              <Button type="submit" size="lg">
                Review & Submit 👀
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

MediaStep.displayName = 'MediaStep';