'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { pricingSchema } from '@/lib/shemas/meal-schema'
import { usePricing, useUpdatePricing } from '@/lib/state/meal-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/card'
import { Form } from '@repo/ui/components/form'
import { Button } from '@repo/ui/components/button'
import { Separator } from '@repo/ui/components/separator'
import { PricingStep as PricingStepType } from '@/types/meal'

import { BasePriceSection } from './components/BasePriceSection'
import { VariantGroupsSection } from './components/VariantGroupsSection'
import { AddonsSection } from './components/AddonsSection'

interface PricingStepProps {
  onNext: () => void
  onBack: () => void
}

export function PricingStep({ onNext, onBack }: PricingStepProps) {
  const pricing = usePricing()
  const updatePricing = useUpdatePricing()
  
  const form = useForm<PricingStepType>({
    resolver: zodResolver(pricingSchema),
    defaultValues: pricing,
  })

  const basePrice = form.watch('basePrice')

  const onSubmit = (data: PricingStepType) => {
    // Ensure each variant group has a default option
    if (data.variants?.length > 0) {
      data.variants.forEach((group, groupIndex) => {
        if (group.options?.length > 0) {
          const hasDefault = group.options.some(option => option.isDefault)
          if (!hasDefault) {
            data.variants[groupIndex].options[0].isDefault = true
          }
        }
      })
    }
    
    updatePricing(data)
    onNext()
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          💰 Pricing & Variants
        </CardTitle>
        <CardDescription>
          Set your base price and add variants or extras to maximize your revenue!
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <BasePriceSection control={form.control} />
            
            <VariantGroupsSection 
              control={form.control} 
              basePrice={basePrice} 
            />

            <Separator />

            <AddonsSection control={form.control} />

            <div className="flex justify-between pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onBack}
                size="lg"
                className="px-8 py-3"
              >
                ← Back
              </Button>
              <Button 
                type="submit" 
                size="lg"
                className="px-8 py-3 transition-all duration-200 hover:scale-105"
              >
                Next: Add Discounts 🏷️
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}