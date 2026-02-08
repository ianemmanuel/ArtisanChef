'use client';

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@repo/ui/lib/utils'
import { useSidebarStore } from '@/lib/state/sidebar-store'
import { NavItem } from '@/utils/constants/nav-links'
import { SidebarDropdown } from './SidebarDropdown'
import { SidebarPopover } from './SidebarPopover'

interface SidebarItemProps {
  item: NavItem;
}

export function SidebarItem({ item }: SidebarItemProps) {
  const pathname = usePathname();
  const { isCollapsed } = useSidebarStore();
  const Icon = item.icon;

  if (item.type === 'dropdown') {
    if (isCollapsed) {
      return <SidebarPopover item={item} />;
    }
    return <SidebarDropdown item={item} />;
  }

  const isActive = pathname === item.href;

  if (isCollapsed) {
    return (
      <Link
        href={item.href!}
        className={cn(
          'flex items-center justify-center rounded-lg p-2.5 transition-all',
          isActive
            ? 'bg-peach-500/10 text-peach-600 dark:text-peach-400'
            : 'text-foreground hover:bg-muted'
        )}
      >
        <Icon className="h-5 w-5" />
      </Link>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
        isActive
          ? 'bg-peach-500/10 text-peach-700 dark:text-peach-300 border border-peach-300 dark:border-peach-600'
          : 'text-foreground hover:bg-muted'
      )}
    >
      <Icon className={cn(
        "h-5 w-5 transition-colors",
        isActive && "text-peach-600 dark:text-peach-400"
      )} />
      <span>{item.label}</span>
    </Link>
  );
}