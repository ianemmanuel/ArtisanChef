'use client';

import { Bell, Menu } from 'lucide-react';
import { Button } from '@repo/ui/components/button';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Badge } from '@repo/ui/components/badge';
import { useSidebarStore } from '@/lib/state/sidebar-store';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import ProfileButton from './ProfileButton';

export function Navbar() {
  const { openMobileSidebar, toggleSidebar } = useSidebarStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-4 sm:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden h-9 w-9"
        onClick={openMobileSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Desktop sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:flex h-9 w-9"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex flex-1 items-center justify-end gap-4">
        <ThemeToggle />

        {/* Signed In State */}
        <SignedIn>
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-primary p-0 text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-popover border-border">
              <div className="px-3 py-2 border-b border-border">
                <p className="font-semibold text-popover-foreground">Notifications</p>
              </div>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                <p className="text-sm font-medium text-popover-foreground">New order received</p>
                <p className="text-xs text-muted-foreground">Order #1234 from Pizza Place</p>
                <p className="text-xs text-muted-foreground">2 minutes ago</p>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                <p className="text-sm font-medium text-popover-foreground">Vendor approval pending</p>
                <p className="text-xs text-muted-foreground">New vendor registration awaiting review</p>
                <p className="text-xs text-muted-foreground">15 minutes ago</p>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                <p className="text-sm font-medium text-popover-foreground">Payment received</p>
                <p className="text-xs text-muted-foreground">$2,450 from weekly settlements</p>
                <p className="text-xs text-muted-foreground">1 hour ago</p>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clerk UserButton */}
          <ProfileButton/>
        </SignedIn>

        {/* Signed Out State */}
        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="outline" size="sm" className="h-9">
              Sign In
            </Button>
          </SignInButton>
        </SignedOut>
      </div>
    </header>
  );
}