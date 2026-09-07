import { describe, it, expect } from "vitest"
import { canManuallyVerify } from "./admin.vendor.payout.service"

/*
 * §12 — an admin may resolve a REQUIRES_REVIEW / PENDING account, but must
 * NOT flip a DEFINITIVE provider rejection to VERIFIED. Pure guard, no DB.
 */

const acct = (over: Partial<Parameters<typeof canManuallyVerify>[0]> = {}) => ({
  verificationStatus: "REQUIRES_REVIEW",
  verificationMethod: "FINANCE_BANK_RESOLUTION",
  verificationFailureCode: null,
  ...over,
})

describe("canManuallyVerify", () => {
  it("allows verifying a REQUIRES_REVIEW account (risk / uncertainty)", () => {
    expect(canManuallyVerify(acct({ verificationStatus: "REQUIRES_REVIEW", verificationFailureCode: "NAME_MISMATCH" })).ok).toBe(true)
  })

  it("allows verifying a PENDING account the provider couldn't auto-check (PROVIDER_UNSUPPORTED)", () => {
    expect(canManuallyVerify(acct({ verificationStatus: "PENDING", verificationMethod: "FORMAT_CHECKS", verificationFailureCode: "PROVIDER_UNSUPPORTED" })).ok).toBe(true)
  })

  it("blocks verifying an account the PROVIDER rejected (INVALID_ACCOUNT / PROVIDER_REJECTED via the automatic path)", () => {
    expect(canManuallyVerify(acct({ verificationStatus: "FAILED", verificationFailureCode: "INVALID_ACCOUNT" })).ok).toBe(false)
    expect(canManuallyVerify(acct({ verificationStatus: "FAILED", verificationFailureCode: "PROVIDER_REJECTED" })).ok).toBe(false)
  })

  it("allows an admin to verify a FAILED account that a human previously rejected (MANUAL_REJECTION)", () => {
    expect(canManuallyVerify(acct({ verificationStatus: "FAILED", verificationMethod: "MANUAL", verificationFailureCode: "MANUAL_REJECTION" })).ok).toBe(true)
  })

  it("allows a legacy FAILED with no failure code (admin discretion)", () => {
    expect(canManuallyVerify(acct({ verificationStatus: "FAILED", verificationFailureCode: null })).ok).toBe(true)
  })

  it("rejects verifying an already-VERIFIED account", () => {
    expect(canManuallyVerify(acct({ verificationStatus: "VERIFIED" })).ok).toBe(false)
  })
})
