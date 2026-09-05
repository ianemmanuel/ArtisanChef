import { describe, it, expect } from "vitest"
import { presentPayoutAccount } from "./vendor.payoutPresentation"

const RAW_ACCOUNT = {
  id                : "acc-1",
  vendorId          : "vendor-1",
  accountHolderName : "Jane Wanjiku",
  bankName          : "Test Bank",
  // ciphertext — must never survive presentPayoutAccount
  bankCode          : "enc:v1.iv.tag.ct",
  accountNumber     : "enc:v1.iv.tag.ct",
  swiftCode         : null,
  iban              : null,
  routingNumber     : null,
  mobileNumber      : null,
  accountNumberHash : "hash-should-never-leave",
  mobileNumberHash  : null,
  maskedDetails     : { accountNumber: "••••7890" },
  nameMatchScore    : 0.42,
  riskFlags         : ["NAME_MISMATCH"],
  verificationStatus: "REQUIRES_REVIEW",
  verificationMeta  : { outcome: { status: "REQUIRES_REVIEW" } },
}

describe("presentPayoutAccount", () => {
  it("strips every encrypted identifier field", () => {
    const out = presentPayoutAccount(RAW_ACCOUNT)
    expect(out.bankCode).toBeUndefined()
    expect(out.accountNumber).toBeUndefined()
    expect(out.swiftCode).toBeUndefined()
    expect(out.iban).toBeUndefined()
    expect(out.routingNumber).toBeUndefined()
    expect(out.mobileNumber).toBeUndefined()
  })

  it("strips the blind-index hashes", () => {
    const out = presentPayoutAccount(RAW_ACCOUNT)
    expect(out.accountNumberHash).toBeUndefined()
    expect(out.mobileNumberHash).toBeUndefined()
  })

  it("replaces maskedDetails with a `masked` field", () => {
    const out = presentPayoutAccount(RAW_ACCOUNT)
    expect(out.maskedDetails).toBeUndefined()
    expect(out.masked).toEqual({ accountNumber: "••••7890" })
  })

  it("defaults to null masked details when none were captured", () => {
    const out = presentPayoutAccount({ ...RAW_ACCOUNT, maskedDetails: null })
    expect(out.masked).toBeNull()
  })

  it("strips risk signals by default (the vendor-facing shape)", () => {
    const out = presentPayoutAccount(RAW_ACCOUNT)
    expect(out.riskFlags).toBeUndefined()
    expect(out.nameMatchScore).toBeUndefined()
    expect(out.verificationMeta).toBeUndefined()
  })

  it("includes risk signals only when explicitly requested (the admin-with-permission shape)", () => {
    const out = presentPayoutAccount(RAW_ACCOUNT, { includeRiskSignals: true })
    expect(out.riskFlags).toEqual(["NAME_MISMATCH"])
    expect(out.nameMatchScore).toBe(0.42)
    expect(out.verificationMeta).toEqual({ outcome: { status: "REQUIRES_REVIEW" } })
  })

  it("never returns the raw account number or bank code even with risk signals included", () => {
    const out = presentPayoutAccount(RAW_ACCOUNT, { includeRiskSignals: true })
    const serialized = JSON.stringify(out)
    expect(serialized).not.toContain("enc:v1.iv.tag.ct")
    expect(serialized).not.toContain("hash-should-never-leave")
  })

  it("passes through non-sensitive fields untouched", () => {
    const out = presentPayoutAccount(RAW_ACCOUNT)
    expect(out.id).toBe("acc-1")
    expect(out.accountHolderName).toBe("Jane Wanjiku")
    expect(out.verificationStatus).toBe("REQUIRES_REVIEW")
  })
})
