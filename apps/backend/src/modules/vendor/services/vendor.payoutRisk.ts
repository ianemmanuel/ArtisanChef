/*
 * Vendor 1D — the pure risk-decision core for VendorPayoutAccount, split out
 * of vendor.payout.service.ts the same way vendor.outletClearance.ts split
 * out of the outlet-document service (Vendor 1A): a DB-free module the
 * DB-coupled service calls, so the actual business decisions are unit
 * testable without a database.
 *
 * This is deliberately NOT a scoring engine — three explicit signals, one
 * explicit precedence rule. See the payout verification brief §11.
 */

export type PayoutRiskFlag = "NAME_MISMATCH" | "ADD_VELOCITY" | "DUPLICATE_IDENTIFIER"

export type NameMatchClassification = "MATCH" | "PARTIAL_MATCH" | "MISMATCH" | "UNAVAILABLE"

export type PayoutVerificationOutcomeStatus = "PENDING" | "VERIFIED" | "FAILED" | "REQUIRES_REVIEW"

/**
 * Presentational classification of a bestNameMatch() score — used on the
 * admin surface so "62%" doesn't require the viewer to know what a good
 * score is. Does not itself decide risk (see computePayoutRiskFlags,
 * which — unchanged from the original single-threshold behavior — only
 * flags below `minAcceptable`, i.e. MISMATCH).
 */
export function classifyNameMatch(
  score: number | null,
  minAcceptable = 0.5,
  strongMatch = 0.8,
): NameMatchClassification {
  if (score === null) return "UNAVAILABLE"
  if (score >= strongMatch) return "MATCH"
  if (score >= minAcceptable) return "PARTIAL_MATCH"
  return "MISMATCH"
}

export interface PayoutRiskSignals {
  nameMatchScore     : number | null
  nameMatchMin       : number
  isDuplicate        : boolean
  addVelocityExceeded: boolean
}

/** Deterministic — same inputs, same flags, every time. */
export function computePayoutRiskFlags(input: PayoutRiskSignals): PayoutRiskFlag[] {
  const flags: PayoutRiskFlag[] = []
  if (input.nameMatchScore !== null && input.nameMatchScore < input.nameMatchMin) flags.push("NAME_MISMATCH")
  if (input.addVelocityExceeded) flags.push("ADD_VELOCITY")
  if (input.isDuplicate) flags.push("DUPLICATE_IDENTIFIER")
  return flags
}

/**
 * The one place "provider verification result + risk signals -> final
 * VendorPayoutAccount.verificationStatus" is decided.
 *
 *   provider FAILED             -> FAILED, always (a confirmed bad account
 *                                   is a fact; no risk flag downgrades it
 *                                   to a "maybe" review)
 *   any risk flag                -> REQUIRES_REVIEW (never silently
 *                                   VERIFIED, never auto-rejected for a
 *                                   signal alone — a human decides)
 *   no risk flag, provider VERIFIED         -> VERIFIED
 *   no risk flag, provider REQUIRES_REVIEW  -> REQUIRES_REVIEW
 *   no risk flag, provider PENDING          -> PENDING (manual queue)
 */
export function decidePayoutAccountStatus(
  providerStatus: PayoutVerificationOutcomeStatus,
  riskFlags: PayoutRiskFlag[],
): PayoutVerificationOutcomeStatus {
  if (providerStatus === "FAILED") return "FAILED"
  if (riskFlags.length > 0) return "REQUIRES_REVIEW"
  return providerStatus
}
