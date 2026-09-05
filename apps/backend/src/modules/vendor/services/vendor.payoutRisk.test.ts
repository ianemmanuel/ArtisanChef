import { describe, it, expect } from "vitest"
import { classifyNameMatch, computePayoutRiskFlags, decidePayoutAccountStatus } from "./vendor.payoutRisk"

describe("classifyNameMatch", () => {
  it("null score is UNAVAILABLE", () => {
    expect(classifyNameMatch(null)).toBe("UNAVAILABLE")
  })
  it("score at/above the strong threshold is MATCH", () => {
    expect(classifyNameMatch(0.8)).toBe("MATCH")
    expect(classifyNameMatch(1)).toBe("MATCH")
  })
  it("score between the acceptable and strong thresholds is PARTIAL_MATCH", () => {
    expect(classifyNameMatch(0.5)).toBe("PARTIAL_MATCH")
    expect(classifyNameMatch(0.79)).toBe("PARTIAL_MATCH")
  })
  it("score below the acceptable threshold is MISMATCH", () => {
    expect(classifyNameMatch(0.49)).toBe("MISMATCH")
    expect(classifyNameMatch(0)).toBe("MISMATCH")
  })
  it("respects custom thresholds", () => {
    expect(classifyNameMatch(0.6, 0.3, 0.9)).toBe("PARTIAL_MATCH")
    expect(classifyNameMatch(0.95, 0.3, 0.9)).toBe("MATCH")
  })
})

describe("computePayoutRiskFlags", () => {
  const base = { nameMatchScore: null, nameMatchMin: 0.5, isDuplicate: false, addVelocityExceeded: false }

  it("no signals -> no flags", () => {
    expect(computePayoutRiskFlags(base)).toEqual([])
  })
  it("name score below the minimum -> NAME_MISMATCH", () => {
    expect(computePayoutRiskFlags({ ...base, nameMatchScore: 0.3 })).toEqual(["NAME_MISMATCH"])
  })
  it("name score at/above the minimum -> no NAME_MISMATCH", () => {
    expect(computePayoutRiskFlags({ ...base, nameMatchScore: 0.5 })).toEqual([])
    expect(computePayoutRiskFlags({ ...base, nameMatchScore: 0.9 })).toEqual([])
  })
  it("null name score never flags (UNAVAILABLE is not a risk signal)", () => {
    expect(computePayoutRiskFlags({ ...base, nameMatchScore: null })).toEqual([])
  })
  it("velocity exceeded -> ADD_VELOCITY", () => {
    expect(computePayoutRiskFlags({ ...base, addVelocityExceeded: true })).toEqual(["ADD_VELOCITY"])
  })
  it("duplicate -> DUPLICATE_IDENTIFIER", () => {
    expect(computePayoutRiskFlags({ ...base, isDuplicate: true })).toEqual(["DUPLICATE_IDENTIFIER"])
  })
  it("multiple signals all flag, in a stable order", () => {
    expect(
      computePayoutRiskFlags({ nameMatchScore: 0.1, nameMatchMin: 0.5, isDuplicate: true, addVelocityExceeded: true }),
    ).toEqual(["NAME_MISMATCH", "ADD_VELOCITY", "DUPLICATE_IDENTIFIER"])
  })
})

describe("decidePayoutAccountStatus", () => {
  it("provider VERIFIED, no risk -> VERIFIED", () => {
    expect(decidePayoutAccountStatus("VERIFIED", [])).toBe("VERIFIED")
  })
  it("provider VERIFIED, with a risk flag -> REQUIRES_REVIEW", () => {
    expect(decidePayoutAccountStatus("VERIFIED", ["NAME_MISMATCH"])).toBe("REQUIRES_REVIEW")
  })
  it("provider PENDING, no risk -> PENDING", () => {
    expect(decidePayoutAccountStatus("PENDING", [])).toBe("PENDING")
  })
  it("provider PENDING, with a risk flag -> REQUIRES_REVIEW", () => {
    expect(decidePayoutAccountStatus("PENDING", ["ADD_VELOCITY"])).toBe("REQUIRES_REVIEW")
  })
  it("provider REQUIRES_REVIEW stays REQUIRES_REVIEW regardless of flags", () => {
    expect(decidePayoutAccountStatus("REQUIRES_REVIEW", [])).toBe("REQUIRES_REVIEW")
    expect(decidePayoutAccountStatus("REQUIRES_REVIEW", ["DUPLICATE_IDENTIFIER"])).toBe("REQUIRES_REVIEW")
  })
  it("provider FAILED always wins — even with no risk flags at all", () => {
    expect(decidePayoutAccountStatus("FAILED", [])).toBe("FAILED")
  })
  it("provider FAILED is never downgraded to REQUIRES_REVIEW by a risk flag", () => {
    expect(decidePayoutAccountStatus("FAILED", ["NAME_MISMATCH", "DUPLICATE_IDENTIFIER"])).toBe("FAILED")
  })
})
