'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@repo/ui/lib/utils'

interface PriceDisplayProps {
  value: number
  label: string
  trend?: 'up' | 'down'
  className?: string
}

export function PriceDisplay({ 
  value, 
  label, 
  trend,
  className
}: PriceDisplayProps) {
  return (
    <div className={cn('p-4 rounded-lg border', className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        {trend === 'down' && <TrendingDown className="h-4 w-4 text-green-600" />}
        {trend === 'up' && <TrendingUp className="h-4 w-4 text-blue-600" />}
        <span className="font-bold">${value.toFixed(2)}</span>
      </div>
    </div>
  )
}