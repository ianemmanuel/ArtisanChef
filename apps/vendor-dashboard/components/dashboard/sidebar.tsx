'use client';

import { cn } from '@repo/ui/lib/utils';
import {
  LayoutDashboard,
  Store,
  Users,
  ShoppingBag,
  BarChart3,
  Settings,
  Package,
  TrendingUp,
  CreditCard,
  Bell,
  Utensils,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Utensils, label: 'Meals', href: '/meals' },
  { icon: ShoppingBag, label: 'Orders', href: '/orders' },
  { icon: Package, label: 'Meal Plans', href: '/meal-plans' },
  { icon: Users, label: 'Customers', href: '/customers' },
  { icon: BarChart3, label: 'Analytics', href: '/analytics' },
  { icon: TrendingUp, label: 'Revenue', href: '/revenue' },
  { icon: CreditCard, label: 'Payments', href: '/payments' },
  { icon: Bell, label: 'Notifications', href: '/notifications' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card transition-transform">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-border px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sage-600 dark:bg-sage-400 shadow-sm">
              <Utensils className="h-5 w-5 text-white dark:text-charcoal-900" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Bread & Bowl</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-sage-500/10 dark:bg-sage-400/10 text-sage-700 dark:text-sage-300'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className={cn(
                  "h-5 w-5",
                  isActive && "text-sage-600 dark:text-sage-400"
                )} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-600 dark:bg-sage-400 text-sm font-semibold text-white dark:text-charcoal-900">
              VD
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">Vendor Name</p>
              <p className="truncate text-xs text-muted-foreground">vendor@example.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}