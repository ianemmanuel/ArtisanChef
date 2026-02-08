import { Badge } from '@repo/ui/components/badge'
import { CheckCircle } from 'lucide-react'
import { usePricing } from '@/lib/state/meal-store'

export function VariantChips() {
  const pricing = usePricing()
  const variants = pricing.variants

  if (!variants || variants.length === 0) return null

  return (
    <div className="space-y-3">
      {variants.map((variant) => (
        <div key={variant.id} className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">{variant.name}</h4>
          <div className="flex flex-wrap gap-2">
            {variant.options.map((option) => (
              <Badge 
                key={option.id} 
                variant={option.isDefault ? "default" : "outline"}
                className="flex items-center gap-1"
              >
                <span>{option.name}</span>
                <span className={option.priceModifier >= 0 ? "text-green-600" : "text-red-600"}>
                  {option.priceModifier >= 0 ? '+' : ''}${option.priceModifier.toFixed(2)}
                </span>
                {option.isDefault && <CheckCircle className="h-3 w-3" />}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
