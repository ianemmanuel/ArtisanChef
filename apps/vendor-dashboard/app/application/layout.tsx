import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
import { UtensilsCrossed } from "lucide-react"

export default function ApplicationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="glow-primary relative min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UtensilsCrossed className="size-4" />
            </span>
            DailyBread
          </Link>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <main className="fade-up w-full">{children}</main>
      </div>
    </div>
  )
}
