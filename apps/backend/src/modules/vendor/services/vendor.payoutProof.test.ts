import { describe, it, expect } from "vitest"
import { decideProofRequirement } from "./vendor.payoutProof"

/*
 * The proof rules are pure — no DB here. What's being pinned down is that
 * PROVIDER and MANUAL are genuinely SEPARATE paths with no fallback between
 * them: a PROVIDER-mode country must never accept a document, and a
 * MANUAL-mode country must never let a bank account through without one.
 */

const MANUAL = { mode: "MANUAL" as const, requiredTypeId: "dt_ke_bank_letter", methodType: "BANK" }
const PROVIDER = { mode: "PROVIDER" as const, requiredTypeId: null, methodType: "BANK" }

describe("decideProofRequirement — MANUAL mode (no provider can verify)", () => {
  it("requires a document when none was submitted", () => {
    expect(decideProofRequirement(MANUAL)).toBe("REQUIRED")
  })

  it("attaches a correctly-typed document with a storage key", () => {
    expect(decideProofRequirement({
      ...MANUAL, submittedTypeId: "dt_ke_bank_letter", submittedStorageKey: "vendors/v1/documents/dt/x.pdf",
    })).toBe("ATTACH")
  })

  it("rejects a document of the wrong type", () => {
    expect(decideProofRequirement({
      ...MANUAL, submittedTypeId: "dt_something_else", submittedStorageKey: "k",
    })).toBe("WRONG_TYPE")
  })

  it("rejects a proof whose upload never completed (no storage key)", () => {
    for (const key of [undefined, null, "", "   "]) {
      expect(decideProofRequirement({
        ...MANUAL, submittedTypeId: "dt_ke_bank_letter", submittedStorageKey: key,
      })).toBe("MISSING_FILE")
    }
  })

  it("skips when the country hasn't configured a proof type yet — the account still goes to review", () => {
    expect(decideProofRequirement({ ...MANUAL, requiredTypeId: null })).toBe("SKIP")
  })
})

describe("decideProofRequirement — PROVIDER mode (automatic verification)", () => {
  it("never asks for a document", () => {
    expect(decideProofRequirement(PROVIDER)).toBe("SKIP")
  })

  it("REFUSES a document rather than silently ignoring it — the paths do not mix", () => {
    expect(decideProofRequirement({
      ...PROVIDER, submittedTypeId: "dt_anything", submittedStorageKey: "k",
    })).toBe("NOT_REQUIRED")
  })

  it("refuses even when a proof type happens to be configured for the country", () => {
    expect(decideProofRequirement({
      ...PROVIDER, requiredTypeId: "dt_ke_bank_letter", submittedTypeId: "dt_ke_bank_letter", submittedStorageKey: "k",
    })).toBe("NOT_REQUIRED")
  })
})

describe("decideProofRequirement — non-bank methods", () => {
  it("skips for mobile money / wallets even in MANUAL mode", () => {
    for (const methodType of ["MOBILE_MONEY", "DIGITAL_WALLET", "CARD"]) {
      expect(decideProofRequirement({ ...MANUAL, methodType })).toBe("SKIP")
    }
  })

  it("rejects a document sent for a non-bank method", () => {
    expect(decideProofRequirement({
      ...MANUAL, methodType: "MOBILE_MONEY", submittedTypeId: "dt_ke_bank_letter", submittedStorageKey: "k",
    })).toBe("NOT_APPLICABLE")
  })
})
