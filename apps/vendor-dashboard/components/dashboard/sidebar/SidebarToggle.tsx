'use client';

import { ChevronLeft } from 'lucide-react';
import { Button } from '@repo/ui/components/button';
import { useSidebarStore } from '@/lib/state/sidebar-store';
import { cn } from '@repo/ui/lib/utils';

interface SidebarToggleProps {
  className?: string;
}

export function SidebarToggle({ className }: SidebarToggleProps) {
  const { isCollapsed, toggleSidebar } = useSidebarStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className={cn(
        'absolute -right-3 top-8 z-50 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar-background shadow-sm transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        isCollapsed && 'rotate-180',
        className
      )}
    >
      <ChevronLeft className="h-3 w-3" />
    </Button>
  );
}