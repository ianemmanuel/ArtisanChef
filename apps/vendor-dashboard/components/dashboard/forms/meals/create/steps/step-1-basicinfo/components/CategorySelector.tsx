// CategorySelector.tsx
'use client'

import { 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@repo/ui/components/form'

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@repo/ui/components/select'

import { useFormContext } from 'react-hook-form'

interface CategorySelectorProps {
  control: any
  watchedCategoryType: string
}

// STATIC VENDOR CATEGORIES
const mockVendorCategories = [
  { id: 'vc1', name: 'Breakfast Specials' },
  { id: 'vc2', name: 'Burgers' },
  { id: 'vc3', name: 'Drinks' },
  { id: 'vc4', name: 'Desserts' },
]

// STATIC PLATFORM CATEGORIES
const mockPlatformCategories = [
  { id: 'pc1', name: 'Italian' },
  { id: 'pc2', name: 'Chinese' },
  { id: 'pc3', name: 'Mexican' },
  { id: 'pc4', name: 'American' },
  { id: 'pc5', name: 'Indian' },
  { id: 'pc6', name: 'Japanese' },
  { id: 'pc7', name: 'Mediterranean' },
  { id: 'pc8', name: 'Thai' },
]

export function CategorySelector({ control, watchedCategoryType }: CategorySelectorProps) {
  const { setValue } = useFormContext()

  // simulate loading state (optional)
  const isLoading = false
  const vendorCategories = mockVendorCategories
  const error = null

  return (
    <>
      {/* CATEGORY TYPE FIELD */}
      <FormField
        control={control}
        name="categoryType"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">🏷️ Category Type *</FormLabel>

            <Select
              onValueChange={(value) => {
                field.onChange(value)
                setValue('categoryId', '')
                setValue('categoryName', '')
              }}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Choose category type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="vendor">🏪 My Categories</SelectItem>
                <SelectItem value="platform">🌐 Platform Categories</SelectItem>
              </SelectContent>
            </Select>

            <FormDescription>
              Choose whether the meal belongs to your categories or the platform ones.
            </FormDescription>

            <FormMessage />
          </FormItem>
        )}
      />

      {/* CATEGORY SELECTION FIELD */}
      <FormField
        control={control}
        name="categoryId"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">📂 Select Category *</FormLabel>

            <Select
              onValueChange={(value) => {
                field.onChange(value)

                // set name
                if (watchedCategoryType === 'vendor') {
                  const selected = vendorCategories.find(c => c.id === value)
                  setValue('categoryName', selected?.name ?? '')
                } else {
                  const selected = mockPlatformCategories.find(c => c.id === value)
                  setValue('categoryName', selected?.name ?? '')
                }
              }}
              defaultValue={field.value}
              disabled={!watchedCategoryType}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !watchedCategoryType
                        ? "Select category type first"
                        : "Choose a category"
                    }
                  />
                </SelectTrigger>
              </FormControl>

              <SelectContent>
                {watchedCategoryType === 'vendor'
                  ? (
                    vendorCategories.length === 0
                      ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">
                          No vendor categories available.
                        </div>
                      )
                      : vendorCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))
                    )
                  : (
                    mockPlatformCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))
                  )
                }
              </SelectContent>
            </Select>

            <FormDescription>
              {watchedCategoryType === 'vendor'
                ? "From your shop's custom categories."
                : "From platform global categories."
              }
            </FormDescription>

            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
