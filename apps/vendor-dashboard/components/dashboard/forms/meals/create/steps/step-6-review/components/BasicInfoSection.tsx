'use client'

import { BadgeList } from './BadgeList'
import { useBasicInfo } from '@/lib/state/meal-store'

export function BasicInfoSection() {
  const basicInfo = useBasicInfo()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Meal Name</p>
          <p className="font-medium">{basicInfo.mealName || 'Not specified'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Category</p>
          <p className="font-medium capitalize">
            {basicInfo.categoryName || 'Not specified'} ({basicInfo.categoryType})
          </p>
        </div>
      </div>
      
      <div>
        <p className="text-sm text-muted-foreground">Description</p>
        <p className="text-sm">{basicInfo.description || 'No description provided'}</p>
      </div>
      
      {basicInfo.allergens?.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">Allergens</p>
          <BadgeList items={basicInfo.allergens} variant="destructive" />
        </div>
      )}
      
      {basicInfo.dietaryTags?.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">Dietary Tags</p>
          <BadgeList 
            items={basicInfo.dietaryTags} 
            variant="default" 
            className="bg-green-600 hover:bg-green-700 text-white" 
          />
        </div>
      )}
    </div>
  )
}