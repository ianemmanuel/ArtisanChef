import { Cake } from 'lucide-react'
import Link from 'next/link'
import { SignedIn, UserButton } from '@clerk/nextjs'

export default function OnboardingNavbar() {
  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card/80 backdrop-blur-sm">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-peach-400 to-peach-600 shadow-sm transition-shadow group-hover:shadow-md">
          <Cake className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-semibold text-foreground">
          Daily Bread
        </span>
      </Link>

      {/* User Profile */}
      <SignedIn>
        <UserButton />
      </SignedIn>
    </header>
  )
}