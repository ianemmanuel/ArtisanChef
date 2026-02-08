'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';
import { NavItem } from '@/utils/constants/nav-links';

interface SidebarDropdownProps {
  item: NavItem;
}

export function SidebarDropdown({ item }: SidebarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const Icon = item.icon;

  const isActive = item.items?.some(subItem => subItem.href === pathname);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
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
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
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