'use client'

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@repo/ui/components/form'
import { Textarea } from '@repo/ui/components/textarea'

interface DescriptionTextareaProps {
  control: any
}

export function DescriptionTextarea({ control }: DescriptionTextareaProps) {
  return (
    <FormField
      control={control}
      name="description"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            📖 Description *
          </FormLabel>
          <FormControl>
            <Textarea 
              placeholder="Describe your meal's taste, ingredients, and what makes it special..."
              className="min-h-[100px] transition-all duration-200 focus:scale-[1.01]"
              {...field}
            />
          </FormControl>
          <FormDescription>
            Paint a delicious picture with words! Include key ingredients and what makes this meal unique.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}