'use client'

import { useFormContext } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@repo/ui/components/form'
import { Input } from '@repo/ui/components/input'
import { RadioGroup, RadioGroupItem } from '@repo/ui/components/radio-group'
import { Label } from '@repo/ui/components/label'

export const DiscountFields = () => {
  const { control, watch } = useFormContext()
  const valueType = watch('valueType')

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="discountName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Discount Name *</FormLabel>
            <FormControl>
              <Input 
                placeholder="e.g., Summer Special, Weekend Deal"
                {...field}
              />
            </FormControl>
            <FormDescription>Give your discount a memorable name</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="valueType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Discount Type *</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex space-x-6"
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

      <FormField
        control={control}
        name="value"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {valueType === 'percentage' ? 'Discount Percentage *' : 'Discount Amount *'}
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
                    const numValue = e.target.value ? parseFloat(e.target.value) : 0
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
            <FormDescription>
              {valueType === 'percentage' 
                ? 'Enter percentage discount (1-100%)'
                : 'Enter fixed amount discount'
              }
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="maxUses"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Maximum Uses (Optional)</FormLabel>
            <FormControl>
              <Input 
                type="number"
                min="1"
                placeholder="100"
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </FormControl>
            <FormDescription>
              Limit how many times this discount can be used (leave empty for unlimited)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="validFrom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date (Optional)</FormLabel>
              <FormControl>
                <Input 
                  type="date"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="validTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Date (Optional)</FormLabel>
              <FormControl>
                <Input 
                  type="date"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}