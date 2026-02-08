'use client'

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { 
  useSelectedGlobalDiscountId,
  useSetSelectedGlobalDiscount,
  useDiscountOption,
  useSetDiscountOption,
  useUpdateDiscount,
} from '@/lib/state/meal-store' // selectors you exported
import { useActiveGlobalDiscounts, useVendorActiveGlobalDiscounts } from '@/hooks/useDiscounts'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@repo/ui/components/card'
import { Form } from '@repo/ui/components/form'
import { Button } from '@repo/ui/components/button'
import { RadioGroup, RadioGroupItem } from '@repo/ui/components/radio-group'
import { Label } from '@repo/ui/components/label'
import { DiscountFields } from './components/DiscountFields'
import { GlobalDiscountsList } from './GlobalDiscountsList'

/**
 * IMPORTANT: Phase 1 UX decision
 * - Only allow "none" or "existing" in the UI for now.
 * - The store still supports `new` for future inline meal-specific discounts.
 */

const discountSchema = z.object({
  discountName: z.string().min(1, 'Discount name is required'),
  valueType: z.enum(['percentage', 'fixed']),
  value: z.number().min(0.01, 'Value must be greater than 0'),
  maxUses: z.number().optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
}).refine((data) => {
  if (data.valueType === 'percentage' && data.value > 100) return false
  return true
}, { message: 'Percentage cannot exceed 100%', path: ['value'] })

interface DiscountsStepProps {
  onNext: () => void
  onBack: () => void
}

export const DiscountsStep: React.FC<DiscountsStepProps> = ({ onNext, onBack }) => {
  // Zustand selectors (small subscriptions -> minimal re-renders)
  const selectedGlobalDiscountId = useSelectedGlobalDiscountId()
  const setSelectedGlobalDiscount = useSetSelectedGlobalDiscount()
  const discountOption = useDiscountOption()
  const setDiscountOption = useSetDiscountOption()
  const updateDiscount = useUpdateDiscount()

  const { data: globalDiscounts = [], isLoading, isError } = useVendorActiveGlobalDiscounts()

  // Form is kept for future 'new' option. For now we won't render it.
  const form = useForm({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      discountName: '',
      valueType: 'percentage' as const,
      value: 0,
      maxUses: undefined,
      validFrom: '',
      validTo: '',
    },
    mode: 'onChange',
  })

  // If store has inline discount data (rare for phase1), populate form
  useEffect(() => {
    // no-op for now — keep the hook so we can re-enable inline creation quickly
  }, [form])

  // Simple validity check for this phase:
  const isStepValid =
    discountOption === 'none' ||
    (discountOption === 'existing' && !!selectedGlobalDiscountId)

  const handleDiscountOptionChange = (option: 'none' | 'existing' | 'new') => {
    // For phase 1 we only let callers set 'none' or 'existing' from UI.
    // But store supports 'new' for later — so keep behavior consistent.
    setDiscountOption(option)
    if (option !== 'existing') setSelectedGlobalDiscount(null)
    if (option !== 'new') updateDiscount(undefined)
  }

  const handleGlobalSelect = (id: string) => {
    setSelectedGlobalDiscount(id)
  }

  const onSubmit = () => {
    // The only action needed in phase 1 is to ensure store holds the selected discount id (already done)
    onNext()
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Discounts & Offers</CardTitle>
        <CardDescription>Add a discount to your meal (optional)</CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="space-y-6">
            <div className="space-y-4">
              <Label className="text-lg font-medium">Choose discount option</Label>

              <RadioGroup value={discountOption} onValueChange={(v) => handleDiscountOptionChange(v as any)} className="space-y-3">
                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="flex-1 cursor-pointer">
                    <div className="font-medium">No discount</div>
                    <div className="text-sm text-muted-foreground">Sell this meal at regular price</div>
                  </Label>
                </div>

                {/* We keep the `new` option in the store for future; hide it from the UI for now */}
                {/* If you want to enable inline creation later, uncomment the block below */}
                {false && (
                  <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="new" id="new" />
                    <Label htmlFor="new" className="flex-1 cursor-pointer">
                      <div className="font-medium">Create new meal-specific discount</div>
                      <div className="text-sm text-muted-foreground">One-off discount tied to this meal</div>
                    </Label>
                  </div>
                )}

                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <RadioGroupItem value="existing" id="existing" />
                  <Label htmlFor="existing" className="flex-1 cursor-pointer">
                    <div className="font-medium">Use existing global campaign</div>
                    <div className="text-sm text-muted-foreground">Link to an active global discount</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* existing global discounts UI */}
            {discountOption === 'existing' && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                <h3 className="text-lg font-semibold">Select Global Discount Campaign</h3>

                <GlobalDiscountsList
                  discounts={globalDiscounts}
                  isLoading={isLoading}
                  isError={isError}
                  selectedDiscountId={selectedGlobalDiscountId}
                  onSelectDiscount={handleGlobalSelect}
                />
              </div>
            )}

            {/* inline new discount (kept for future) */}
            {discountOption === 'new' && (
              <div className="space-y-4 p-6 bg-muted/50 rounded-lg border">
                <h3 className="text-lg font-semibold">Create New Discount</h3>
                <DiscountFields />
              </div>
            )}

            <div className="flex justify-between pt-6">
              <Button type="button" variant="outline" onClick={onBack} size="lg">Back</Button>
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={() => handleDiscountOptionChange('none')} size="lg">
                  Skip discounts
                </Button>
                <Button type="submit" size="lg" disabled={!isStepValid}>
                  Next: Add Media
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default DiscountsStep
