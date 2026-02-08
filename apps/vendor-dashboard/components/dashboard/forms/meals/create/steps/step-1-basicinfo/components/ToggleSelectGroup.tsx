'use client'

import { Button } from '@repo/ui/components/button'
import { X } from 'lucide-react'

interface ToggleSelectGroupProps {
  options: string[]
  selectedValues: string[]
  onToggle: (value: string) => void
  label: string
  description: string
}

export function ToggleSelectGroup({
  options,
  selectedValues,
  onToggle,
  label,
  description,
}: ToggleSelectGroupProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium leading-none">
        {label}
      </label>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option)
          return (
            <Button
              key={option}
              type="button"
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onToggle(option)}
              className="transition-all duration-200 hover:scale-105"
            >
              {option}
              {isSelected && <X className="ml-1 h-3 w-3" />}
            </Button>
          )
        })}
      </div>
    </div>
  )
}