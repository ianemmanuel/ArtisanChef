'use client'

import { useDiscount } from '@/lib/state/meal-store'
import { 
  BadgePercent as BadgePercentIcon,
  Tags as TagsIcon,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Gift as GiftIcon,
  UserCog as UserCogIcon,
  ShoppingBasket as ShoppingBasketIcon,
  Cake as CakeIcon,
  Package as PackageIcon,
  Truck as TruckIcon,
  Users as UsersIcon,
  Star as StarIcon,
  Crown as CrownIcon,
  DollarSign as DollarSignIcon
} from 'lucide-react'
import { Badge } from '@repo/ui/components/badge'

export function DiscountSection() {
  const discount = useDiscount()

  if (!discount) return null

  const formatTime = (timeString?: string) => {
    if (!timeString) return ''
    try {
      const [hours, minutes] = timeString.split(':')
      const hourNum = parseInt(hours)
      const period = hourNum >= 12 ? 'PM' : 'AM'
      const displayHour = hourNum % 12 || 12
      return `${displayHour}:${minutes} ${period}`
    } catch {
      return timeString
    }
  }

  const formatDate = (date?: Date | string) => {
    if (!date) return ''
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return String(date)
    }
  }

  const formatDays = (days?: string[]) => {
    if (!days || days.length === 0) return ''
    return days.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ')
  }

  const getDiscountTypeInfo = (type: string) => {
    const typeMap = {
      'percentage': { icon: BadgePercentIcon, label: 'Percentage Discount', color: 'text-blue-600' },
      'fixed-amount': { icon: DollarSignIcon, label: 'Fixed Amount Discount', color: 'text-green-600' },
      'bogo': { icon: GiftIcon, label: 'Buy One Get One', color: 'text-purple-600' },
      'promo-code': { icon: TagsIcon, label: 'Promo Code Discount', color: 'text-pink-600' },
      'first-time': { icon: StarIcon, label: 'First-Time Customer', color: 'text-yellow-600' },
      'loyalty': { icon: CrownIcon, label: 'Loyalty Customer', color: 'text-indigo-600' },
      'time-based': { icon: ClockIcon, label: 'Happy Hour', color: 'text-orange-600' },
      'free-delivery': { icon: TruckIcon, label: 'Free Delivery', color: 'text-emerald-600' },
      'minimum-order': { icon: ShoppingBasketIcon, label: 'Minimum Order Discount', color: 'text-teal-600' },
      'group': { icon: UsersIcon, label: 'Group Discount', color: 'text-cyan-600' },
      'birthday': { icon: CakeIcon, label: 'Birthday Special', color: 'text-rose-600' },
      'bundle': { icon: PackageIcon, label: 'Bundle Deal', color: 'text-violet-600' },
    }
    return typeMap[type as keyof typeof typeMap] || { icon: TagsIcon, label: 'Custom Discount', color: 'text-gray-600' }
  }

  const renderMainDiscountValue = () => {
    const { type, value = 0, valueType, buyQuantity, getQuantity, promoCode } = discount

    switch (type) {
      case 'percentage':
      case 'fixed-amount':
      case 'first-time':
      case 'loyalty':
      case 'minimum-order':
      case 'group':
      case 'birthday':
        return (
          <div className="text-center py-4 px-6 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-lg border">
            <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">
              {valueType === 'fixed' || type === 'fixed-amount' ? `$${value.toFixed(2)}` : `${value}%`} OFF
            </div>
            <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
              {getDiscountTypeInfo(type).label}
            </p>
          </div>
        )
        
      case 'time-based':
      case 'bundle':
        return (
          <div className="text-center py-4 px-6 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-lg border">
            <div className="text-xl font-bold text-orange-800 dark:text-orange-200 mb-1">
              {discount.discountName || getDiscountTypeInfo(type).label}
            </div>
            <div className="text-lg font-semibold text-orange-700 dark:text-orange-300">
              {valueType === 'fixed' ? `$${value.toFixed(2)}` : `${value}%`} OFF
            </div>
            <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
              {getDiscountTypeInfo(type).label}
            </p>
          </div>
        )

      case 'bogo':
        return (
          <div className="text-center py-4 px-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg border">
            <div className="text-xl font-bold text-purple-800 dark:text-purple-200">
              Buy {buyQuantity || 1} Get {getQuantity || 1} FREE
            </div>
            <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
              Buy One Get One Offer
            </p>
          </div>
        )

      case 'promo-code':
        return (
          <div className="text-center py-4 px-6 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 rounded-lg border">
            <div className="text-lg font-bold text-pink-800 dark:text-pink-200 mb-2">
              {promoCode && (
                <Badge variant="secondary" className="text-lg px-3 py-1 font-mono font-bold">
                  {promoCode}
                </Badge>
              )}
            </div>
            <div className="text-xl font-semibold text-pink-700 dark:text-pink-300">
              {value}% OFF
            </div>
            <p className="text-sm text-pink-600 dark:text-pink-400 mt-1">
              Promo Code Discount
            </p>
          </div>
        )

      case 'free-delivery':
        return (
          <div className="text-center py-4 px-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-lg border">
            <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-center gap-2">
              <TruckIcon className="h-6 w-6" />
              FREE DELIVERY
            </div>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
              No delivery charges
            </p>
          </div>
        )

      default:
        return null
    }
  }

  const renderSpecificDetails = () => {
    const details = []

    // BOGO specific details
    if (discount.type === 'bogo' && discount.maxRedemptions) {
      details.push(
        <div key="max-redemptions" className="flex items-center gap-3 py-2">
          <GiftIcon className="h-4 w-4 text-orange-500" />
          <span>Max {discount.maxRedemptions} free items per order</span>
        </div>
      )
    }

    // Loyalty specific details
    if (discount.type === 'loyalty') {
      if (discount.minOrders) {
        details.push(
          <div key="min-orders" className="flex items-center gap-3 py-2">
            <CrownIcon className="h-4 w-4 text-orange-500" />
            <span>Requires {discount.minOrders}+ previous orders</span>
          </div>
        )
      }
      if (discount.minSpendTotal) {
        details.push(
          <div key="min-spend-total" className="flex items-center gap-3 py-2">
            <DollarSignIcon className="h-4 w-4 text-orange-500" />
            <span>Requires ${discount.minSpendTotal.toFixed(2)} total lifetime spend</span>
          </div>
        )
      }
    }

    // Time-based specific details
    if (discount.type === 'time-based' && discount.applicableTimes) {
      details.push(
        <div key="happy-hour" className="flex items-center gap-3 py-2">
          <ClockIcon className="h-4 w-4 text-orange-500" />
          <span>
            Available {formatTime(discount.applicableTimes.start)} - {formatTime(discount.applicableTimes.end)}
          </span>
        </div>
      )
    }

    // Minimum order details
    if (discount.minOrder && (discount.type === 'minimum-order' || discount.type === 'group')) {
      const label = discount.type === 'group' ? 'minimum group size' : 'minimum order'
      const unit = discount.type === 'group' ? '' : '$'
      const value = discount.type === 'group' ? discount.minOrder : discount.minOrder.toFixed(2)
      details.push(
        <div key="min-order" className="flex items-center gap-3 py-2">
          <ShoppingBasketIcon className="h-4 w-4 text-orange-500" />
          <span>Requires {unit}{value} {label}</span>
        </div>
      )
    }

    // Bundle specific details
    if (discount.type === 'bundle') {
      if (discount.minSpend) {
        details.push(
          <div key="bundle-min-spend" className="flex items-center gap-3 py-2">
            <PackageIcon className="h-4 w-4 text-orange-500" />
            <span>Minimum spend: ${discount.minSpend.toFixed(2)}</span>
          </div>
        )
      }
      if (discount.requiredVariants && discount.requiredVariants.length > 0) {
        details.push(
          <div key="required-variants" className="flex items-center gap-3 py-2">
            <PackageIcon className="h-4 w-4 text-orange-500" />
            <span>Requires specific variants ({discount.requiredVariants.length} selected)</span>
          </div>
        )
      }
      if (discount.requiredAddons && discount.requiredAddons.length > 0) {
        details.push(
          <div key="required-addons" className="flex items-center gap-3 py-2">
            <PackageIcon className="h-4 w-4 text-orange-500" />
            <span>Requires specific add-ons ({discount.requiredAddons.length} selected)</span>
          </div>
        )
      }
    }

    // Birthday specific details
    if (discount.type === 'birthday' && discount.birthdayMode) {
      const modeLabels = {
        auto: 'Applies to all customer birthdays',
        'date-range': 'Applies during specific date range',
        'single-date': 'Applies on specific date only'
      }
      details.push(
        <div key="birthday-mode" className="flex items-center gap-3 py-2">
          <CakeIcon className="h-4 w-4 text-orange-500" />
          <span>{modeLabels[discount.birthdayMode as keyof typeof modeLabels]}</span>
        </div>
      )
    }

    return details.length > 0 ? (
      <div className="space-y-2 border-t pt-4">
        <h5 className="font-medium text-sm text-gray-600 dark:text-gray-400">Additional Details:</h5>
        {details}
      </div>
    ) : null
  }

  const renderDateTimeRestrictions = () => {
    const restrictions = []

    // Date restrictions
    if (discount.dateMode === 'days' && discount.applicableDays && discount.applicableDays.length > 0) {
      restrictions.push(
        <div key="applicable-days" className="py-3 px-4 bg-blue-50 dark:bg-blue-950/20 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <CalendarIcon className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-800 dark:text-blue-200">Applicable Days:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {discount.applicableDays.map(day => (
              <Badge key={day} variant="secondary" className="text-xs">
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </Badge>
            ))}
          </div>
        </div>
      )
    }

    if (discount.dateMode === 'date-range' && discount.dateRange) {
      restrictions.push(
        <div key="date-range" className="py-3 px-4 bg-blue-50 dark:bg-blue-950/20 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <CalendarIcon className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-800 dark:text-blue-200">Valid Period:</span>
          </div>
          <span className="text-sm">
            {formatDate(discount.dateRange.start)} - {formatDate(discount.dateRange.end)}
          </span>
        </div>
      )
    }

    if (discount.dateMode === 'single-date' && discount.specificDate) {
      restrictions.push(
        <div key="specific-date" className="py-3 px-4 bg-blue-50 dark:bg-blue-950/20 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <CalendarIcon className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-800 dark:text-blue-200">Valid On:</span>
          </div>
          <span className="text-sm">{formatDate(discount.specificDate)}</span>
        </div>
      )
    }

    // Birthday date restrictions
    if (discount.type === 'birthday' && discount.birthdayMode !== 'auto') {
      if (discount.birthdayMode === 'date-range' && discount.validFrom && discount.validTo) {
        restrictions.push(
          <div key="birthday-range" className="py-3 px-4 bg-rose-50 dark:bg-rose-950/20 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <CakeIcon className="h-4 w-4 text-rose-600" />
              <span className="font-medium text-rose-800 dark:text-rose-200">Birthday Period:</span>
            </div>
            <span className="text-sm">
              {formatDate(discount.validFrom)} - {formatDate(discount.validTo)}
            </span>
          </div>
        )
      }

      if (discount.birthdayMode === 'single-date' && discount.validFrom) {
        restrictions.push(
          <div key="birthday-single" className="py-3 px-4 bg-rose-50 dark:bg-rose-950/20 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <CakeIcon className="h-4 w-4 text-rose-600" />
              <span className="font-medium text-rose-800 dark:text-rose-200">Special Date:</span>
            </div>
            <span className="text-sm">{formatDate(discount.validFrom)}</span>
          </div>
        )
      }
    }

    return restrictions.length > 0 ? (
      <div className="space-y-3 border-t pt-4">
        <h5 className="font-medium text-sm text-gray-600 dark:text-gray-400">When Available:</h5>
        {restrictions}
      </div>
    ) : null
  }

  const typeInfo = getDiscountTypeInfo(discount.type)
  const TypeIcon = typeInfo.icon

  return (
    <div className="p-6 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
          <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">
            Discount Offer
          </h3>
          <p className="text-sm text-orange-600 dark:text-orange-400">
            {typeInfo.label}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-md border p-4 space-y-4">
        {renderMainDiscountValue()}
        {renderSpecificDetails()}
        {renderDateTimeRestrictions()}
      </div>
    </div>
  )
}