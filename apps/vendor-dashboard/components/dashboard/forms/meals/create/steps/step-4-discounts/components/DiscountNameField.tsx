'use client'

import { Control } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@repo/ui/components/form'
import { Input } from '@repo/ui/components/input'

interface DiscountNameFieldProps {
  control: Control<any>
  name: string
  label?: string
  placeholder?: string
  description?: string
  required?: boolean
}

export const DiscountNameField = ({
  control,
  name,
  label = 'Discount Name',
  placeholder = 'e.g., Evening Special, Weekend Deal',
  description = 'Give your discount a memorable name',
  required = false
}: DiscountNameFieldProps) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && ' *'}
          </FormLabel>
          <FormControl>
            <Input 
              placeholder={placeholder}
              {...field}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}