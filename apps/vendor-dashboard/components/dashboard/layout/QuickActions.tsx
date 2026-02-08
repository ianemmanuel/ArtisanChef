'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card"
import { Button } from "@repo/ui/components/button"
import {
  Plus,
  Utensils,
  Calendar,
  Tag,
  Cake,
  ArrowUpRight,
} from "lucide-react"

const quickActions = [
  {
    title: "Create Meal",
    description: "Add new meal to menu",
    icon: Utensils,
    href: "/meals/create",
    // Peach gradient for main action
    iconBg: "bg-gradient-to-br from-peach-400 to-peach-600",
  },
  {
    title: "Create Meal Plan",
    description: "Setup subscription plan",
    icon: Calendar,
    href: "/meal-plans/create",
    // Mint for subscription/recurring
    iconBg: "bg-gradient-to-br from-mint-400 to-mint-600",
  },
  {
    title: "Create Discount",
    description: "Add promotion or coupon",
    icon: Tag,
    href: "/discounts/create",
    // Cream/gold for discounts/promotions
    iconBg: "bg-gradient-to-br from-cream-400 to-cream-600",
  },
  {
    title: "Add Bakery Item",
    description: "Fresh bread & pastries",
    icon: Cake,
    href: "/bakery/create",
    // Lavender for special/premium items
    iconBg: "bg-gradient-to-br from-lavender-400 to-lavender-600",
  },
]

export function QuickActions() {
  return (
    <Card className="border border-border shadow-card hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {/* Peach icon header */}
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-peach-400 to-peach-600 shadow-sm">
            <Plus className="h-5 w-5 text-white" />
          </div>
          <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
        </div>
        <CardDescription className="text-sm text-muted-foreground pt-1">
          Quickly create new content and promotions
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.title}
                variant="outline"
                className="h-auto p-4 justify-start hover:shadow-sm hover:border-peach-400 dark:hover:border-peach-500 transition-all duration-200 group"
                asChild
              >
                <a href={action.href}>
                  <div className="flex items-center gap-3 w-full">
                    {/* Gradient icon backgrounds */}
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.iconBg} shrink-0 shadow-sm`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    
                    {/* Text - stays black/white */}
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium text-foreground truncate group-hover:text-peach-600 dark:group-hover:text-peach-400 transition-colors">
                        {action.title}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {action.description}
                      </div>
                    </div>
                    
                    {/* Arrow */}
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-peach-600 dark:group-hover:text-peach-400 transition-colors shrink-0" />
                  </div>
                </a>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}