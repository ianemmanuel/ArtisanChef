/*
 * The payout-account REVIEW workflow state — pure, so the rules are
 * exhaustively unit-testable without a database (same convention as
 * vendor.payoutRisk.ts and vendor.payoutProof.ts's decideProofRequirement).
 *
 * Deliberately DERIVED rather than stored. VendorAppeal and
 * VendorComplianceCase each carry their own status enum because they have no
 * other notion of "done"; a payout account already has one —
 * verificationStatus. Adding a second enum would give "is this resolved?"
 * two sources of truth that could disagree, which is exactly the kind of
 * collapsed-axis problem the rest of this codebase avoids.
 *
 *   UNCLAIMED — awaiting review, nobody assigned, never escalated
 *   CLAIMED   — an admin owns it (claimed directly, or reassigned to them)
 *   ESCALATED — sitting in the open pool after an escalation
 *   RESOLVED  — verificationStatus reached a terminal outcome
 */

export type PayoutReviewState = "UNCLAIMED" | "CLAIMED" | "ESCALATED" | "RESOLVED"

export interface PayoutReviewInput {
  /** PENDING | VERIFIED | FAILED | REQUIRES_REVIEW */
  verificationStatus: string
  assignedReviewerId: string | null
  escalatedAt       : Date | string | null
}

/** VERIFIED / FAILED are the terminal verification outcomes — the review is over. */
const TERMINAL_VERIFICATION = new Set(["VERIFIED", "FAILED"])

export function payoutReviewState(input: PayoutReviewInput): PayoutReviewState {
  if (TERMINAL_VERIFICATION.has(input.verificationStatus)) return "RESOLVED"
  if (input.assignedReviewerId) return "CLAIMED"
  // escalatedAt persists as a historical marker after a reassignment, so it
  // only means "in the pool" while nobody holds the claim.
  if (input.escalatedAt) return "ESCALATED"
  return "UNCLAIMED"
}

/** Only a live (non-terminal) review can be claimed, escalated or reassigned. */
export function isPayoutReviewOpen(input: PayoutReviewInput): boolean {
  return payoutReviewState(input) !== "RESOLVED"
}
