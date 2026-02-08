'use client';

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sheet, SheetContent } from '@repo/ui/components/sheet'
import { useSidebarStore } from '@/lib/state/sidebar-store'
import { menuItems } from '@/utils/constants/nav-links'
import { cn } from '@repo/ui/lib/utils'
import { ChevronDown, Cake } from 'lucide-react'

export function SidebarMobile() {
  const { isMobileOpen, closeMobileSidebar } = useSidebarStore();
  const pathname = usePathname();
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());

  const toggleDropdown = (label: string) => {
    const newOpenDropdowns = new Set(openDropdowns);
    if (newOpenDropdowns.has(label)) {
      newOpenDropdowns.delete(label);
    } else {
      newOpenDropdowns.add(label);
    }
    setOpenDropdowns(newOpenDropdowns);
  };

  return (
    <Sheet open={isMobileOpen} onOpenChange={closeMobileSidebar}>
      <SheetContent
        side="left"
        className="w-64 p-0 border-r border-border bg-card"
        style={{ 
          maxHeight: '100vh',
          overflow: 'hidden'
        }}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center border-b border-border px-6 shrink-0">
            <div className="flex items-center gap-2.5">
              {/* Peach gradient icon */}
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-peach-400 to-peach-600 shadow-sm">
                <Cake className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-semibold tracking-tight text-foreground">
                Bread & Bowl
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isDropdownOpen = openDropdowns.has(item.label);

              if (item.type === 'dropdown') {
                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      onClick={() => toggleDropdown(item.label)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-peach-500/10 text-peach-700 dark:text-peach-300 border border-peach-300 dark:border-peach-600'
                          : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn(
                          "h-5 w-5 transition-colors",
                          isActive && "text-peach-600 dark:text-peach-400"
                        )} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          isDropdownOpen && 'rotate-180'
                        )}
                      />
                    </button>
                    
                    {isDropdownOpen && (
                      <div className="ml-6 space-y-1 border-l border-border pl-3">
                        {item.items?.map((subItem) => {
                          const isSubActive = pathname === subItem.href;
                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              className={cn(
                                'block rounded-lg px-3 py-2 text-sm transition-all',
                                isSubActive
                                  ? 'text-peach-600 dark:text-peach-400 font-medium'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                              onClick={closeMobileSidebar}
                            >
                              {subItem.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href!}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-peach-500/10 text-peach-700 dark:text-peach-300 border border-peach-300 dark:border-peach-600'
                      : 'text-foreground hover:bg-muted'
                  )}
                  onClick={closeMobileSidebar}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-colors",
                    isActive && "text-peach-600 dark:text-peach-400"
                  )} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}