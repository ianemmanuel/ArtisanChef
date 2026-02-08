'use client';

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@repo/ui/components/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui/components/popover'
import { cn } from '@repo/ui/lib/utils'
import { NavItem } from '@/utils/constants/nav-links'

interface SidebarPopoverProps {
  item: NavItem;
}

export function SidebarPopover({ item }: SidebarPopoverProps) {
  const pathname = usePathname();
  const Icon = item.icon;

  const isActive = item.items?.some(subItem => subItem.href === pathname);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-10 w-10 transition-all',
            isActive
              ? 'bg-peach-500/10 text-peach-600 dark:text-peach-400'
              : 'text-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Icon className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="w-48 p-2 border border-border bg-card shadow-lg"
      >
        <div className="space-y-1">
          <p className="px-2 py-1.5 text-sm font-semibold text-foreground border-b border-border pb-2 mb-1">
            {item.label}
          </p>
          {item.items?.map((subItem) => {
            const isSubActive = pathname === subItem.href;
            return (
              <Link
                key={subItem.href}
                href={subItem.href}
                className={cn(
                  'block rounded-lg px-2 py-1.5 text-sm transition-all',
                  isSubActive
                    ? 'bg-peach-500/10 text-peach-600 dark:text-peach-400 font-medium'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                {subItem.label}
              </Link>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}