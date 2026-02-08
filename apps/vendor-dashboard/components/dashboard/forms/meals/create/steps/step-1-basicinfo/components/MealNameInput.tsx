'use client'

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@repo/ui/components/form'
import { Input } from '@repo/ui/components/input'

interface MealNameInputProps {
  control: any
}

export function MealNameInput({ control }: MealNameInputProps) {
  return (
    <FormField
      control={control}
      name="mealName"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            🍽️ Meal Name *
          </FormLabel>
          <FormControl>
            <Input 
              placeholder="e.g., Grandma's Special Lasagna" 
              {...field}
              className="transition-all duration-200 focus:scale-[1.02]"
            />
          </FormControl>
          <FormDescription>
            Make it mouth-watering and memorable!
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}