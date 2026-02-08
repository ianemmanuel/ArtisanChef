'use client'

import { useAvailability } from '@/lib/state/meal-store'
import { 
  Calendar as CalendarIcon,
  CheckCircle2 as CheckCircleIcon,
  CalendarDays as CalendarDaysIcon,
  Clock as ClockIcon,
  CalendarClock as CalendarClockIcon,
  CalendarRange as CalendarRangeIcon
} from 'lucide-react'

export function AvailabilitySection() {
  const availability = useAvailability()

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const renderAvailabilityDetails = () => {
    switch (availability.type) {
      case 'always':
        return (
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <p>Available at all times during business hours</p>
          </div>
        )
        
      case 'specific-days':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-blue-500" />
              <p>Available on selected days:</p>
            </div>
            {availability.days?.length ? (
              <div className="flex flex-wrap gap-2">
                {availability.days.map(day => (
                  <span 
                    key={day} 
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-full text-sm capitalize"
                  >
                    {day}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No days selected</p>
            )}
          </div>
        )
        
      case 'specific-times':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-amber-500" />
              <p>Available daily at specific times:</p>
            </div>
            {availability.startTime && availability.endTime ? (
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/30 px-4 py-2 rounded-md">
                <span className="font-medium">{formatTime(availability.startTime)}</span>
                <span>to</span>
                <span className="font-medium">{formatTime(availability.endTime)}</span>
              </div>
            ) : (
              <p className="text-muted-foreground">Time range not specified</p>
            )}
          </div>
        )
        
      case 'specific-days-times':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarClockIcon className="h-5 w-5 text-purple-500" />
              <p>Custom schedule:</p>
            </div>
            {availability.customSchedule?.length ? (
              <div className="space-y-2">
                {availability.customSchedule.map((schedule, index) => (
                  <div key={index} className="flex items-start gap-4 bg-purple-50 dark:bg-purple-900/20 px-4 py-3 rounded-md">
                    <span className="font-medium min-w-[100px] capitalize">{schedule.day}</span>
                    <div className="flex items-center gap-2">
                      <span>{formatTime(schedule.startTime)}</span>
                      <span>to</span>
                      <span>{formatTime(schedule.endTime)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No schedule configured</p>
            )}
          </div>
        )
        
      case 'custom-date-range':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarRangeIcon className="h-5 w-5 text-emerald-500" />
              <p>Available for a specific date range:</p>
            </div>
            {availability.startDate && availability.endDate ? (
              <div className="space-y-2">
                <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 rounded-md">
                  <span className="font-medium">From:</span>
                  <span>{formatDate(availability.startDate)}</span>
                  <span className="font-medium">To:</span>
                  <span>{formatDate(availability.endDate)}</span>
                </div>
                {availability.hasTimeRange && (
                  <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 rounded-md">
                    <span className="font-medium">Time range:</span>
                    <span>{formatTime(availability.dateRangeStartTime)}</span>
                    <span>to</span>
                    <span>{formatTime(availability.dateRangeEndTime)}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Date range not specified</p>
            )}
          </div>
        )
        
      default:
        return <p className="text-muted-foreground">Availability not configured</p>
    }
  }

  return (
    <div className="p-6 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-4">
      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
        <CalendarIcon className="h-5 w-5" />
        <span>Availability Configuration</span>
      </h3>
      <div className="p-4 bg-white dark:bg-gray-900 rounded-md border">
        <div className="mb-3">
          <span className="text-sm text-muted-foreground">Type:</span>
          <span className="ml-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-full text-sm capitalize">
            {availability.type.replace(/-/g, ' ')}
          </span>
        </div>
        {renderAvailabilityDetails()}
      </div>
    </div>
  )
}