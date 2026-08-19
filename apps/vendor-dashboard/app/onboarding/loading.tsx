import { Skeleton } from "@/components/ui/skeleton"

/*
 * Shown instantly on navigation while the segment below (layout.tsx's
 * session check, plus whichever step page's own backendFetch calls)
 * resolves — without this, App Router has no pending UI to show and a
 * step change looks like a frozen click until the server responds.
 */
export default function OnboardingLoading() {
  return (
    <div className="glow-primary relative min-h-screen bg-background">
      <div className="border-b border-border/60 bg-card/60">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6">
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <Skeleton className="h-7 w-full max-w-lg" />

        <div className="mx-auto mt-8 max-w-2xl space-y-6">
          <Skeleton className="mx-auto h-8 w-64" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
