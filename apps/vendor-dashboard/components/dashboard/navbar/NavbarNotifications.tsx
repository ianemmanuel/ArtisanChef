'use client';

import { Button } from '@repo/ui/components/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@repo/ui/components/dropdown-menu'
import { Badge, Bell, ChevronRight, Check } from 'lucide-react'
import Link from 'next/link'

const NavbarNotifications = () => {
  // Mock notifications data
  const notifications = [
    {
      id: 1,
      title: 'New order received',
      description: 'Order #1234 from Pizza Place',
      time: '2 minutes ago',
      unread: true,
      type: 'order'
    },
    {
      id: 2,
      title: 'Vendor approval pending',
      description: 'New vendor registration awaiting review',
      time: '15 minutes ago',
      unread: true,
      type: 'vendor'
    },
    {
      id: 3,
      title: 'Payment received',
      description: '$2,450 from weekly settlements',
      time: '1 hour ago',
      unread: false,
      type: 'payment'
    },
    {
      id: 4,
      title: 'Low inventory alert',
      description: 'Chicken breasts running low (12 units left)',
      time: '3 hours ago',
      unread: false,
      type: 'inventory'
    }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9 rounded-lg hover:bg-primary/5 transition-colors border border-transparent hover:border-border"
        >
          <div className="relative">
            <Bell className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
            
            {/* Subtle notification indicator */}
            {unreadCount > 0 && (
              <div className="absolute -right-1 -top-1">
                <div className="h-2 w-2 rounded-full bg-primary animate-ping opacity-75" />
                <div className="absolute top-0 left-0 h-2 w-2 rounded-full bg-primary" />
              </div>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-96 bg-background/95 backdrop-blur-sm border-border shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="font-semibold text-foreground">Notifications</p>
          </div>
        </div>

        {/* Notifications list */}
        <div className="max-h-100 overflow-y-auto">
          {notifications.map((notification) => (
            <DropdownMenuItem 
              key={notification.id}
              className={`flex flex-col items-start gap-1 p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0
                ${notification.unread ? 'bg-primary/5' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                // Handle notification click
              }}
            >
              <div className="flex items-start justify-between w-full">
                <div className="flex-1">
                  {/* Title with unread indicator */}
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {notification.title}
                    </p>
                    {notification.unread && (
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                  
                  {/* Description */}
                  <p className="text-sm text-muted-foreground mt-1">
                    {notification.description}
                  </p>
                  
                  {/* Time and type badge */}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {notification.time}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full
                      ${notification.type === 'order' ? 'bg-blue-500/10 text-blue-600' :
                        notification.type === 'vendor' ? 'bg-amber-500/10 text-amber-600' :
                        notification.type === 'payment' ? 'bg-emerald-500/10 text-emerald-600' :
                        'bg-red-500/10 text-red-600'
                      }`}
                    >
                      {notification.type}
                    </span>
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </div>

        {/* Footer with View All link */}
        <div className="border-t border-border p-3">
          <Link 
            href="/notifications" 
            className="flex items-center justify-center w-full py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors rounded-md hover:bg-primary/5"
          >
            View all notifications
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NavbarNotifications