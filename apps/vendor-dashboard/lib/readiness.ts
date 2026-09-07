import type { VendorGoLiveStatus } from "@repo/types/vendor-app"

/*
 * Maps the authoritative VendorGoLiveStatus (computed by the backend's
 * getVendorGoLiveStatus) into vendor-facing requirement rows. This is pure
 * presentation — every `met` flag comes straight off the backend result, no
 * readiness is re-derived here. Labels follow Vendor 1A's "consumer-specific
 * wording, shared codes" convention: the codes live in @repo/types
 * (VendorGoLiveBlocker), the vendor-friendly phrasing lives here.
 */

export interface ReadinessRequirement {
  key  : "payout" | "profile" | "outlet"
  /** Short heading for the requirement. */
  title: string
  /** Shown when the requirement is satisfied. */
  doneLabel: string
  /** Shown, as a call to action, when it isn't. */
  todoLabel: string
  /** One line of context for the setup checklist. */
  description: string
  met  : boolean
  /** An existing vendor-dashboard page that manages / resolves this requirement. */
  href : string
}

/* Only VERIFIED satisfies readiness — every other state gets a specific
 * call-to-action so the vendor knows exactly where they stand (§6). */
const PAYOUT_TODO: Record<VendorGoLiveStatus["payoutAccountState"], string> = {
  NONE           : "Add a payout account",
  PENDING        : "Payout account verification pending",
  REQUIRES_REVIEW: "Payout account requires review",
  FAILED         : "Payout account verification failed — fix and try again",
  VERIFIED       : "Payout account verified",
}

export function readinessRequirements(status: VendorGoLiveStatus): ReadinessRequirement[] {
  const profilePending = status.blockers.includes("PROFILE_UNDER_REVIEW")

  return [
    {
      key      : "payout",
      title    : "Payout account",
      met      : status.hasVerifiedPayoutAccount,
      href     : "/setup/payout",
      doneLabel: "Payout account verified",
      todoLabel: PAYOUT_TODO[status.payoutAccountState],
      description: "Add a bank, mobile money, or wallet account and get it verified so we can pay you out.",
    },
    {
      key      : "profile",
      title    : "Public profile",
      met      : status.hasProfile && status.isProfileReviewClear,
      href     : "/setup/profile",
      doneLabel: "Public profile complete",
      todoLabel: profilePending ? "Your public profile is under review" : "Complete your public profile",
      description: "How customers see your business — name, story, cuisine and imagery.",
    },
    {
      key      : "outlet",
      title    : "Outlet",
      met      : status.hasActiveOutlet,
      href     : "/setup/outlets",
      doneLabel: "Active outlet ready",
      todoLabel: "Create or activate a qualifying outlet",
      description: "At least one active, cleared outlet where you'll prepare and serve orders.",
    },
  ]
}

/** Presentation-level "X of N complete" — never persisted. */
export function readinessProgress(status: VendorGoLiveStatus): { done: number; total: number } {
  const reqs = readinessRequirements(status)
  return { done: reqs.filter((r) => r.met).length, total: reqs.length }
}
