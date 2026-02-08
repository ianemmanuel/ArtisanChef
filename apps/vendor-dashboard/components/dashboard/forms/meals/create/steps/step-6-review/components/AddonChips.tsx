'use client'

import { Badge } from '@repo/ui/components/badge'
import { Package, Users } from 'lucide-react'

export function AddonChips() {
  const addons = [
    {
      id: 1,
      name: "Wine",
      priceModifier: 12.50,
      stockLimit: 10,
      maxPerOrder: 2,
    },
    {
      id: 2,
      name: "Cheese",
      priceModifier: 5.00,
      stockLimit: 20,
      maxPerOrder: 3,
    },
    {
      id: 3,
      name: "Extra Sauce",
      priceModifier: -1.00, // negative price
      stockLimit: null,
      maxPerOrder: null,
    }
  ]

  if (!addons?.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {addons.map((addon) => (
        <Badge 
          key={addon.id} 
          variant="secondary"
          className="flex items-center gap-1 px-2 py-1"
        >
          <span>{addon.name}</span>

          {/* Price */}
          <span className={addon.priceModifier >= 0 ? "text-green-600" : "text-red-600"}>
            {addon.priceModifier >= 0 ? '+' : ''}
            ${addon.priceModifier.toFixed(2)}
          </span>

          {/* Stock Limit */}
          {addon.stockLimit && (
            <div className="flex items-center gap-1 ml-1 text-xs">
              <Package className="h-3 w-3" />
              <span>{addon.stockLimit}</span>
            </div>
          )}

          {/* Max Per Order */}
          {addon.maxPerOrder && (
            <div className="flex items-center gap-1 ml-1 text-xs">
              <Users className="h-3 w-3" />
              <span>max {addon.maxPerOrder}</span>
            </div>
          )}
        </Badge>
      ))}
    </div>
  )
}
