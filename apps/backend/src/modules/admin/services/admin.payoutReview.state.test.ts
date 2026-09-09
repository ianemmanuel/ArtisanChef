import { describe, it, expect } from "vitest"
import { payoutReviewState, isPayoutReviewOpen } from "./admin.payoutReview.state"

/*
 * Pure — no DB. What's pinned down here is that the workflow state is
 * DERIVED consistently, with no second source of truth for "is this
 * resolved" (verificationStatus already answers that), and that an
 * escalation marker left behind by history never masquerades as a live
 * pool item once someone holds the claim.
 */

const base = { verificationStatus: "PENDING", assignedReviewerId: null, escalatedAt: null }

describe("payoutReviewState", () => {
  it("UNCLAIMED when awaiting review with no owner and no escalation", () => {
    expect(payoutReviewState(base)).toBe("UNCLAIMED")
    expect(payoutReviewState({ ...base, verificationStatus: "REQUIRES_REVIEW" })).toBe("UNCLAIMED")
  })

  it("CLAIMED once an admin owns it", () => {
    expect(payoutReviewState({ ...base, assignedReviewerId: "admin-1" })).toBe("CLAIMED")
  })

  it("ESCALATED while it sits in the pool with nobody holding it", () => {
    expect(payoutReviewState({ ...base, escalatedAt: new Date() })).toBe("ESCALATED")
  })

  it("a reassigned account reads CLAIMED, not ESCALATED — escalatedAt is only history", () => {
    // The exact trap: escalatedAt persists forever as a marker, so deriving
    // "in the pool" from it alone would wrongly keep an owned account in the
    // escalation queue.
    expect(payoutReviewState({
      ...base, escalatedAt: new Date(), assignedReviewerId: "admin-2",
    })).toBe("CLAIMED")
  })

  it("RESOLVED once verification is terminal, whoever held it", () => {
    for (const status of ["VERIFIED", "FAILED"]) {
      expect(payoutReviewState({ ...base, verificationStatus: status })).toBe("RESOLVED")
      expect(payoutReviewState({ ...base, verificationStatus: status, assignedReviewerId: "a" })).toBe("RESOLVED")
      expect(payoutReviewState({ ...base, verificationStatus: status, escalatedAt: new Date() })).toBe("RESOLVED")
    }
  })

  it("PENDING and REQUIRES_REVIEW are both still open", () => {
    expect(isPayoutReviewOpen(base)).toBe(true)
    expect(isPayoutReviewOpen({ ...base, verificationStatus: "REQUIRES_REVIEW" })).toBe(true)
    expect(isPayoutReviewOpen({ ...base, verificationStatus: "VERIFIED" })).toBe(false)
    expect(isPayoutReviewOpen({ ...base, verificationStatus: "FAILED" })).toBe(false)
  })

  it("accepts an ISO string for escalatedAt (as it arrives over the wire)", () => {
    expect(payoutReviewState({ ...base, escalatedAt: new Date().toISOString() })).toBe("ESCALATED")
  })
})
