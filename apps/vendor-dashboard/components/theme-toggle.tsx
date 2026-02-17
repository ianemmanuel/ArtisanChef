'use client';

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import { Button } from "@repo/ui/components/button"

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeToggle = () => {
    setIsAnimating(true);
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    
    // Reset animation state after transition
    setTimeout(() => setIsAnimating(false), 600);
  };

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10"
        aria-label="Loading theme"
        disabled
      >
        <div className="h-5 w-5 rounded-full bg-muted animate-pulse" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleThemeToggle}
      className={`h-10 w-10 relative overflow-hidden border-border/50 transition-all duration-500 rounded-full shadow-sm hover:shadow-md group
        ${isAnimating ? 'scale-95 rotate-180' : 'scale-100 rotate-0'}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      disabled={isAnimating}
    >
      {/* Animated background gradient */}
      <div className={`absolute inset-0 bg-linear-to-br transition-all duration-700
        ${isDark 
          ? 'from-blue-500/0 via-purple-400/0 to-indigo-300/0 group-hover:from-blue-500/20 group-hover:via-purple-400/20 group-hover:to-indigo-300/20' 
          : 'from-amber-400/0 via-orange-300/0 to-yellow-200/0 group-hover:from-amber-400/20 group-hover:via-orange-300/20 group-hover:to-yellow-200/20'
        }`} />
      
      {/* Animated sun rays */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500
        ${isDark ? 'opacity-0' : 'opacity-100'}`}>
        {[0, 45, 90, 135].map((rotation) => (
          <div 
            key={rotation}
            className={`absolute h-full w-px bg-linear-to-b from-amber-400/40 to-transparent transition-all duration-1000
              ${isAnimating ? 'animate-[spin_1.5s_linear_infinite]' : ''}`}
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        ))}
      </div>

      {/* Animated stars for dark mode */}
      <div className={`absolute inset-0 transition-opacity duration-500
        ${isDark ? 'opacity-100' : 'opacity-0'}`}>
        {[
          { top: '20%', left: '30%', delay: '0s' },
          { top: '40%', left: '70%', delay: '0.2s' },
          { top: '70%', left: '40%', delay: '0.4s' },
          { top: '30%', left: '60%', delay: '0.6s' },
        ].map((star, index) => (
          <div 
            key={index}
            className={`absolute h-0.5 w-0.5 bg-white/70 rounded-full animate-ping`}
            style={{
              top: star.top,
              left: star.left,
              animationDelay: star.delay,
            }}
          />
        ))}
      </div>

      {/* Sun/Moon icons with smooth transitions */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Sun */}
        <div className={`absolute transition-all duration-700 ease-in-out
          ${isDark 
            ? 'opacity-0 scale-0 -rotate-90' 
            : 'opacity-100 scale-100 rotate-0'
          }`}>
          <Sun className="h-5 w-5 text-amber-600" />
          {/* Sun glow effect */}
          <div className={`absolute -inset-2 bg-amber-400/20 blur-md rounded-full animate-pulse
            ${isAnimating ? 'animate-ping' : ''}`} />
        </div>
        
        {/* Moon */}
        <div className={`absolute transition-all duration-700 ease-in-out
          ${isDark 
            ? 'opacity-100 scale-100 rotate-0' 
            : 'opacity-0 scale-0 rotate-90'
          }`}>
          <Moon className="h-5 w-5 text-blue-300" />
          {/* Moon glow effect */}
          <div className="absolute -inset-2 bg-blue-400/20 blur-md rounded-full" />
        </div>
      </div>

      {/* Floating particles animation */}
      <div className="absolute inset-0 overflow-hidden rounded-full">
        {/* Light mode particles (sun dust) */}
        <div className={`absolute transition-all duration-1000
          ${isDark ? 'opacity-0' : 'opacity-100'}`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`light-${i}`}
              className={`absolute h-0.75 w-0.75 bg-primary-300/50 rounded-full 
                animate-[float_3s_ease-in-out_infinite]`}
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>

        {/* Dark mode particles (twinkling stars) */}
        <div className={`absolute transition-all duration-1000
          ${isDark ? 'opacity-100' : 'opacity-0'}`}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`dark-${i}`}
              className={`absolute h-0.5 w-0.5 bg-blue-200/70 rounded-full 
                animate-[twinkle_2s_ease-in-out_infinite]`}
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Pulsing ring animation on hover */}
      <div className={`absolute -inset-2 rounded-full border-2 border-transparent 
        group-hover:animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]
        ${isDark 
          ? 'group-hover:border-blue-400/30' 
          : 'group-hover:border-amber-400/30'
        }`} />
    </Button>
  );
}