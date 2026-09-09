import Link from "next/link"
import { Rocket } from "lucide-react"
import type { VendorGoLiveStatus } from "@repo/types/vendor-app"

/*
 * Shown across the dashboard while the vendor is not yet selling-ready.
 *
 * The Uber Eats / DoorDash pattern: a merchant can work on their menu
 * straight away, but a persistent, specific reminder of what's still
 * outstanding sits above it — so "why can't customers see me?" is always
 * answered on screen rather than in a support ticket.
 *
 * Deliberately reads the authoritative blocker list rather than re-deriving
 * readiness; it is a signpost into /setup, never a gate.
 */

const BLOCKER_LABEL: Record<string, string> = {
  VERIFIED_PAYOUT_ACCOUNT: "a verified payout account",
  PROFILE                : "your business profile",
  PROFILE_UNDER_REVIEW   : "your profile to pass review",
  OUTLET                 : "at least one active location",
}

export function NotLiveBanner({ status }: { status: VendorGoLiveStatus }) {
  if (status.canGoLive && status.isPublished) return null

  const outstanding = status.blockers.map((b) => BLOCKER_LABEL[b] ?? b)
  const message = status.canGoLive
    ? "Your setup is complete — publish your storefront to start receiving orders."
    : outstanding.length > 0
      ? `You still need ${formatList(outstanding)}.`
      : "Finish your setup to start receiving orders."

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <div className="text-sm">
          <p className="font-medium">Your store isn&apos;t live yet</p>
          <p className="text-muted-foreground">
            {message} You can keep building your menu in the meantime.
          </p>
        </div>
      </div>
      <Link
        href="/setup"
        className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-center text-sm font-medium text-white hover:bg-amber-700"
      >
        {status.canGoLive ? "Go live" : "Finish setup"}
      </Link>
    </div>
  )
}

/** "a, b and c" — plain prose, not a bullet list. */
function formatList(items: string[]): string {
  if (items.length === 1) return items[0]!
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}
