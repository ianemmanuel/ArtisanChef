import { Coffee, Home } from 'lucide-react'
import Link from 'next/link'

export default function AuthNavbar() {
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border/40 bg-card/80 backdrop-blur-md supports-backdrop-filter:bg-card/60">
      <div className="container mx-auto flex h-full items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-espresso-600 to-espresso-700 shadow-sm transition-all group-hover:shadow-md group-hover:scale-105">
            <Coffee className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground tracking-tight">
              ArtisanChef
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              Vendor Portal
            </div>
          </div>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <Link
            href="/support"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Help
          </Link>
          <div className="h-6 w-px bg-border" />
        </div>
      </div>
    </header>
  )
}