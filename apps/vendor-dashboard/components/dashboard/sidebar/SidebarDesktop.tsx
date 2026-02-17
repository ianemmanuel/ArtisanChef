'use client';

import { useSidebarStore } from '@/lib/state/sidebar-store'
import { SidebarNav } from './SidebarNav'
import { cn } from '@repo/ui/lib/utils'
import { Cake } from 'lucide-react'

export function SidebarDesktop() {
  const { isCollapsed } = useSidebarStore();

  return (
    <div
      className={cn(
        'relative hidden lg:flex h-screen flex-col border-r border-border bg-card transition-all duration-300 fixed left-0 top-0 z-40',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center border-b border-border px-4 shrink-0">
        <div className="flex items-center gap-2.5 w-full min-w-0 justify-center">
          {/* Peach gradient icon */}
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-peach-400 to-peach-600 shadow-sm shrink-0">
            <Cake className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <span className="text-xl font-semibold tracking-tight text-foreground truncate">
              Artisan Chef
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-hidden">
        <SidebarNav />
      </div>
    </div>
  );
}