'use client'

import { Control } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@repo/ui/components/form'
import { RadioGroup, RadioGroupItem } from '@repo/ui/components/radio-group'
import { Label } from '@repo/ui/components/label'

interface DiscountTypeSelectorProps {
  control: Control<any>
  name: string
  label?: string
  className?: string
}

export const DiscountTypeSelector = ({
  control,
  name,
  label = 'Discount Type *',
  className = 'flex flex-row space-x-6'
}: DiscountTypeSelectorProps) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value}
              className={className}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage">Percentage (%)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed">Fixed Amount ($)</Label>
              </div>
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}