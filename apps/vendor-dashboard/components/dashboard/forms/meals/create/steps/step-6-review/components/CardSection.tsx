'use client'

import { Separator } from '@repo/ui/components/separator'

interface CardSectionProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  showSeparator?: boolean
}

export function CardSection({ 
  title, 
  icon, 
  children, 
  showSeparator = true 
}: CardSectionProps) {
  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {children}
      </div>
      {showSeparator && <Separator />}
    </>
  )
}