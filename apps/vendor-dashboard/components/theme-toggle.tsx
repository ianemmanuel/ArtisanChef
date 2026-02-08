'use client';

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from "@repo/ui/components/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="h-9 w-9 relative overflow-hidden group"
      aria-label="Toggle theme"
    >
      {/* Amber glow background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-400/0 to-amber-600/0 group-hover:from-amber-400/10 group-hover:to-amber-600/10 transition-all duration-300 rounded-lg" />
      
      {/* Sun icon */}
      <Sun className="h-5 w-5 text-amber-600 dark:text-amber-400 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
      
      {/* Moon icon */}
      <Moon className="absolute h-5 w-5 text-amber-800 dark:text-amber-300 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
      
      {/* Pulsing dot indicator */}
      <div className="absolute -top-0.5 -right-0.5">
        <div className="h-2 w-2 rounded-full bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-amber-pulse" />
      </div>
    </Button>
  );
}