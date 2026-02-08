'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { basicInfoSchema } from '@/lib/shemas/meal-schema'
import { useBasicInfo, useUpdateBasicInfo } from '@/lib/state/meal-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/card'
import { Form } from '@repo/ui/components/form'
import { Button } from '@repo/ui/components/button'
import { MealNameInput } from './components/MealNameInput'
import { CategorySelector } from './components/CategorySelector'
import { DescriptionTextarea } from './components/DescriptionTextarea'
import { ToggleSelectGroup } from './components/ToggleSelectGroup'
import type { BasicInfoStep as BasicInfoStepType } from '@/lib/shemas/meal-schema'
import { useCallback, useMemo } from 'react'

const allergenOptions = [
  'Gluten', 'Dairy', 'Eggs', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts', 'Soy', 'Sesame'
]

const dietaryOptions = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Low-Carb', 'High-Protein', 'Organic'
]

interface BasicInfoStepProps {
  onNext: () => void
}

export function BasicInfoStep({ onNext }: BasicInfoStepProps) {
  const basicInfo = useBasicInfo()
  const updateBasicInfo = useUpdateBasicInfo()
  
  // Memoize default values to prevent recreation on every render
  const defaultValues = useMemo(() => ({
    mealName: basicInfo?.mealName || '',
    description: basicInfo?.description || '',
    allergens: basicInfo?.allergens || [],
    dietaryTags: basicInfo?.dietaryTags || [],
    categoryType: basicInfo?.categoryType || 'platform' as const,
    categoryId: basicInfo?.categoryId || '',
    categoryName: basicInfo?.categoryName || '',
  }), [basicInfo])
  
  const form = useForm<BasicInfoStepType>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues,
  })

  const onSubmit = useCallback((data: BasicInfoStepType) => {
    // Clean submission - convert empty arrays to undefined for optional fields
    const submissionData = {
      ...data,
      allergens: data.allergens?.length ? data.allergens : undefined,
      dietaryTags: data.dietaryTags?.length ? data.dietaryTags : undefined,
    }
    
    updateBasicInfo(submissionData)
    onNext()
  }, [updateBasicInfo, onNext])

  // Optimized toggle functions that avoid unnecessary operations
  const toggleAllergen = useCallback((allergen: string) => {
    const current = form.getValues('allergens') || []
    const updated = current.includes(allergen) 
      ? current.filter(a => a !== allergen)
      : [...current, allergen]
    form.setValue('allergens', updated)
  }, [form])

  const toggleDietaryTag = useCallback((tag: string) => {
    const current = form.getValues('dietaryTags') || []
    const updated = current.includes(tag)
      ? current.filter(t => t !== tag)
      : [...current, tag]
    form.setValue('dietaryTags', updated)
  }, [form])

  // Get current values using watch only for UI display (minimal watching)
  const watchedAllergens = form.watch('allergens')
  const watchedDietaryTags = form.watch('dietaryTags')
  const categoryType = form.watch('categoryType')

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          📝 Basic Information
        </CardTitle>
        <CardDescription>
          Let's start with the essentials. Tell us about your delicious meal!
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MealNameInput control={form.control} />
              <CategorySelector 
                control={form.control} 
                watchedCategoryType={categoryType} 
              />
            </div>

            <DescriptionTextarea control={form.control} />

            <div className="space-y-4">
              <ToggleSelectGroup
                options={allergenOptions}
                selectedValues={watchedAllergens || []}
                onToggle={toggleAllergen}
                label="⚠️ Allergens (Optional)"
                description="Help customers stay safe by marking any allergens in your meal"
              />

              <ToggleSelectGroup
                options={dietaryOptions}
                selectedValues={watchedDietaryTags || []}
                onToggle={toggleDietaryTag}
                label="🌱 Dietary Tags (Optional)"
                description="Highlight special dietary features to attract the right customers"
              />
            </div>

            <div className="flex justify-end pt-6">
              <Button 
                type="submit" 
                size="lg"
                className="px-8 py-3 transition-all duration-200 hover:scale-105"
              >
                Next: Set Availability 📅
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}