import { TrendingDown, TrendingUp } from 'lucide-react'
import { PriceDisplay } from './PriceDisplay'
import { VariantChips } from './VariantChips'
import { AddonChips } from './AddonChips'
import { usePricing, } from '@/lib/state/meal-store'

export function PricingSection() {
  const pricing = usePricing()
  const basePrice = pricing.basePrice

  // Calculate price range based on variants and addons
  const calculatePriceRange = () => {
    let minPrice = basePrice
    let maxPrice = basePrice

    // Add minimum variant price (could be negative)
    if (pricing.variants.length > 0) {
      const variantPrices = pricing.variants.flatMap(variant => 
        variant.options.map(option => option.priceModifier)
      )
      const minVariantPrice = Math.min(...variantPrices, 0)
      const maxVariantPrice = Math.max(...variantPrices, 0)
      
      minPrice += minVariantPrice
      maxPrice += maxVariantPrice
    }

    // Add addon prices (assuming customer might select all)
    if (pricing.addons.length > 0) {
      const totalAddonPrice = pricing.addons.reduce((sum, addon) => sum + addon.priceModifier, 0)
      maxPrice += totalAddonPrice
    }

    return { minPrice: Math.max(0, minPrice), maxPrice }
  }

  const { minPrice, maxPrice } = calculatePriceRange()

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PriceDisplay 
          value={basePrice} 
          label="Base Price"
          className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
        />
        
        <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border">
          <p className="text-sm text-muted-foreground">Price Range</p>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-green-600" />
            <span className="font-bold">${minPrice.toFixed(2)}</span>
            <span className="text-muted-foreground">to</span>
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="font-bold">${maxPrice.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <p className="text-sm text-purple-700 dark:text-purple-300">Variants</p>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {pricing.variants.length}
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400">
            {pricing.addons.length} add-ons
          </p>
        </div>
      </div>

      {pricing.variants.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">Variants</p>
          <VariantChips />
        </div>
      )}

      {pricing.addons.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">Add-ons</p>
          <AddonChips />
        </div>
      )}
    </>
  )
}