'use client';

import { Menu } from 'lucide-react';
import { Button } from '@repo/ui/components/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { useSidebarStore } from '@/lib/state/sidebar-store';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import ProfileButton from './ProfileButton';
import NavbarNotifications from './NavbarNotifications';

export function Navbar() {
  const { openMobileSidebar, toggleSidebar } = useSidebarStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/60 px-4 sm:px-6">
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
        <SignedIn>
          {/* Notifications */}
          <NavbarNotifications/>
          {/* Clerk UserButton */}
          <ProfileButton/>
        </SignedIn>

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