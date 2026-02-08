'use client'

import { Control } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@repo/ui/components/form'
import { Input } from '@repo/ui/components/input'

interface DiscountValueInputProps {
  control: Control<any>
  name: string
  valueType: 'percentage' | 'fixed'
  label?: string
  description?: string
  required?: boolean
}

export const DiscountValueInput = ({
  control,
  name,
  valueType,
  label,
  description,
  required = true
}: DiscountValueInputProps) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label || (
              <>
                {valueType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
                {required && ' *'}
              </>
            )}
          </FormLabel>
          <FormControl>
            <div className="relative">
              {valueType === 'fixed' && (
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  $
                </span>
              )}
              <Input
                type="number"
                step={valueType === 'fixed' ? '0.01' : '1'}
                min={valueType === 'fixed' ? '0.01' : '1'}
                max={valueType === 'percentage' ? '100' : undefined}
                placeholder={valueType === 'percentage' ? '10' : '5.00'}
                className={valueType === 'fixed' ? 'pl-8' : ''}
                value={field.value || ''}
                onChange={(e) => {
                  const numValue = e.target.value ? parseFloat(e.target.value) : ''
                  field.onChange(numValue)
                }}
              />
              {valueType === 'percentage' && (
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              )}
            </div>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}