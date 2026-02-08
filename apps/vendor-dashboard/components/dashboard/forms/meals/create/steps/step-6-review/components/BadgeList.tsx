'use client'

import { Badge } from '@repo/ui/components/badge'
import { cn } from '@repo/ui/lib/utils'

interface BadgeListProps {
  items: string[]
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  className?: string
}

export function BadgeList({ 
  items, 
  variant = 'outline',
  className
}: BadgeListProps) {
  if (!items?.length) return null

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge 
          key={item} 
          variant={variant} 
          className={cn('text-xs', className)}
        >
          {item}
        </Badge>
      ))}
    </div>
  )
}