"use client"

import { Button } from '@repo/ui/components/button'
import { Card, CardContent } from '@repo/ui/components/card'
import { Form } from '@repo/ui/components/form'
import { ChefHat, Loader2} from 'lucide-react'
import BasicInfoSection from './BasicInfoSection'
import ImageUploadSection from './ImageUploadSection'
import SettingsSection from './SettingsSection'
import PreviewSection from './PreviewSection'
import { useCategoryForm } from '@/hooks/useCategoryForm'

export default function CreateCategoryForm() {
  const {
    form,
    mainImageUrl,
    mainImageFile,
    galleryUrls,
    galleryFiles,
    isSubmitting,
    watchIsActive,
    watchIsFeatured,
    handleMainImageChange,
    handleGalleryChange,
    handleRemoveMainImage,
    handleRemoveGalleryImage,
    onSubmit
  } = useCategoryForm()

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border shadow-lg dark:shadow-muted/20">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <BasicInfoSection form={form} isSubmitting={isSubmitting} />
              
              <ImageUploadSection
                form={form}
                isSubmitting={isSubmitting}
                mainImageFile={mainImageFile}
                mainImageUrl={mainImageUrl}
                galleryFiles={galleryFiles}
                galleryUrls={galleryUrls}
                onMainImageChange={handleMainImageChange}
                onGalleryChange={handleGalleryChange}
                onRemoveMainImage={handleRemoveMainImage}
                onRemoveGalleryImage={handleRemoveGalleryImage}
              />
              
              <SettingsSection form={form} isSubmitting={isSubmitting} />
              
              <PreviewSection
                watchIsActive={watchIsActive}
                watchIsFeatured={watchIsFeatured}
                galleryFiles={galleryFiles}
              />

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="h-12 px-8 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary/90 text-white font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Category...
                    </>
                  ) : (
                    <>
                      <ChefHat className="w-4 h-4 mr-2" />
                      Create Category
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}