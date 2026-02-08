'use client'

import React from 'react'
import { GlobalDiscountResponse } from '@/types/discounts'
import {
  Card,
  CardContent
} from '@repo/ui/components/card'
import { RadioGroup, RadioGroupItem } from '@repo/ui/components/radio-group'
import { Label } from '@repo/ui/components/label'
import { Skeleton } from '@repo/ui/components/skeleton'
import { Badge } from '@repo/ui/components/badge'

interface GlobalDiscountsListProps {
  discounts: GlobalDiscountResponse[]
  isLoading?: boolean
  isError?: boolean
  selectedDiscountId?: string | null
  onSelectDiscount: (discountId: string) => void
}

export const GlobalDiscountsList: React.FC<GlobalDiscountsListProps> = ({
  discounts,
  isLoading,
  isError,
  selectedDiscountId,
  onSelectDiscount
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-6 text-destructive">
        Unable to load discounts. Please try again.
      </div>
    )
  }

  if (!discounts || discounts.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p>No active global discount campaigns found.</p>
        <p className="text-sm">Create global discounts in your dashboard first.</p>
      </div>
    )
  }

  return (
    <RadioGroup value={selectedDiscountId ?? ''} onValueChange={(v) => onSelectDiscount(v)} className="space-y-3">
      {discounts.map((d) => (
        <Card key={d.id} className="cursor-pointer">
          <CardContent className="p-3 flex items-center gap-3">
            <RadioGroupItem value={d.id} id={d.id} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="font-medium">{d.name}</div>
                <Badge variant="outline" className="ml-4">
                  {d.type === 'PERCENTAGE' ? `${d.value}%` : `$${d.value.toFixed(2)}`}
                </Badge>
              </div>
              {d.description && <div className="text-sm text-muted-foreground mt-1">{d.description}</div>}
            </div>
          </CardContent>
        </Card>
      ))}
    </RadioGroup>
  )
}

export default GlobalDiscountsList
