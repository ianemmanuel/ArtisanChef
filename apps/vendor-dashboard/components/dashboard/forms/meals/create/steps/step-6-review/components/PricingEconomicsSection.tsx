'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { usePricing, useDiscount } from '@/lib/state/meal-store'
import { PricingStep, DiscountStep, MealVariant, MealAddon, MealVariantOption } from '@/types/meal'

function calculatePricingData(pricing: PricingStep, discount: DiscountStep | undefined) {
  const { basePrice, variants = [], addons = [] } = pricing
  
  // Calculate minimum price (base + cheapest variant if any)
  const cheapestVariantPrice = variants.length > 0 
    ? Math.min(...variants.flatMap((v: MealVariant) => v.options.map((o: MealVariantOption) => o.priceModifier || 0)))
    : 0
  
  const minPrice = basePrice + Math.max(0, cheapestVariantPrice)
  
  // Calculate maximum price (base + all most expensive variants + addons)
  const maxVariantPrice = variants.reduce((sum: number, variant: MealVariant) => {
    const maxOptionPrice = Math.max(...variant.options.map((o: MealVariantOption) => o.priceModifier || 0))
    return sum + maxOptionPrice
  }, 0)
  
  const maxAddonPrice = addons.reduce((sum: number, addon: MealAddon) => sum + (addon.priceModifier || 0), 0)
  const maxPrice = basePrice + maxVariantPrice + maxAddonPrice
  
  // Apply discount if applicable - with proper null checking
  const hasDiscount = Boolean(discount?.value)
  let finalMinPrice = minPrice
  let finalMaxPrice = maxPrice
  
  if (hasDiscount && discount && discount.value && discount.valueType) {
    const discountMultiplier = discount.valueType === 'percentage' 
      ? (100 - discount.value) / 100 
      : 1
    const discountAmount = discount.valueType === 'fixed' ? discount.value : 0
    
    if (discount.valueType === 'percentage') {
      finalMinPrice = minPrice * discountMultiplier
      finalMaxPrice = maxPrice * discountMultiplier
    } else {
      finalMinPrice = Math.max(0, minPrice - discountAmount)
      finalMaxPrice = Math.max(0, maxPrice - discountAmount)
    }
  }
  
  return {
    minPrice: finalMinPrice,
    maxPrice: finalMaxPrice,
    hasDiscount,
    variantCount: variants.length,
    addonCount: addons.length
  }
}

export function PricingEconomicsSection() {
  const pricing = usePricing()
  const discount = useDiscount()
  
  const pricingData = useMemo(() => 
    calculatePricingData(pricing, discount), 
    [pricing, discount]
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-800">
        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
          <TrendingDown className="h-4 w-4" />
          Minimum Price Point
        </h4>
        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
          ${pricingData.minPrice.toFixed(2)}
        </p>
        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
          Base price {pricingData.variantCount > 0 ? '+ cheapest variant' : ''} 
          {pricingData.hasDiscount ? ' (after discount)' : ''}
        </p>
      </div>
      
      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Maximum Price Point
        </h4>
        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
          ${pricingData.maxPrice.toFixed(2)}
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
          With all variants & add-ons
          {pricingData.hasDiscount ? ' (after discount)' : ''}
        </p>
      </div>
    </div>
  )
}