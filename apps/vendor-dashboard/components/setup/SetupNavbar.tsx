"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { UtensilsCrossed } from "lucide-react"
import { cn } from "@/lib/utils"

/*
 * The setup area's only navigation. A slim top bar — brand, the handful of
 * setup destinations, and the account menu. No operational actions (Add
 * Meal / Add Plan), no notifications, no theme toggle: this is account
 * configuration, not the operational dashboard.
 */
const SETUP_LINKS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/setup", label: "Overview", exact: true },
  { href: "/setup/payout", label: "Payout" },
  { href: "/setup/profile", label: "Profile" },
  { href: "/setup/outlets", label: "Outlets" },
  { href: "/setup/documents", label: "Documents" },
]

export function SetupNavbar() {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/setup" className="flex shrink-0 items-center gap-2 font-display text-lg font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-4" />
          </span>
          <span className="hidden sm:inline">DailyBread</span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto sm:justify-center">
          {SETUP_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href, link.exact) ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive(link.href, link.exact)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
    </header>
  )
}
