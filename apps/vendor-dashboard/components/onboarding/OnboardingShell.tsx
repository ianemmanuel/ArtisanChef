import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
import { UtensilsCrossed } from "lucide-react"
import { StepRail } from "./StepRail"
import type { VendorLifecycleState } from "@repo/types/vendor-app"

/*
 * Shared chrome for every /onboarding/* page — deliberately light: a
 * logo, the step rail, and an account menu. No sidebar/nav here, since
 * onboarding is a linear flow the vendor hasn't "arrived" into the
 * product from yet.
 */
export function OnboardingShell({
  state,
  children,
}: {
  state: VendorLifecycleState
  children: React.ReactNode
}) {
  return (
    <div className="glow-primary relative min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/onboarding" className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UtensilsCrossed className="size-4" />
            </span>
            DailyBread
          </Link>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <StepRail state={state} />
        <main className="fade-up mt-8">{children}</main>
      </div>
    </div>
  )
}
