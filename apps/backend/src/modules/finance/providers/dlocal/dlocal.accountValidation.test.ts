import { describe, it, expect } from "vitest"
import {
  buildAccountValidationBody,
  parseAccountValidationResponse,
  isDlocalSupportedCountry,
} from "./dlocal.accountValidation"
import type { ResolveBankAccountInput } from "../provider.types"

const NG_INPUT: ResolveBankAccountInput = {
  bankCode: "058",
  accountNumber: "0036123456",
  currency: "NGN",
  countryCode: "NG",
}

describe("dLocal account validation — country support", () => {
  it("supports Nigeria, case-insensitively", () => {
    expect(isDlocalSupportedCountry("NG")).toBe(true)
    expect(isDlocalSupportedCountry("ng")).toBe(true)
  })

  it("does not claim countries the adapter has no mapping for", () => {
    for (const c of ["KE", "GH", "ZA", "US", ""]) expect(isDlocalSupportedCountry(c)).toBe(false)
  })
})

describe("dLocal account validation — request body", () => {
  it("builds the Nigeria body: country + account_type=BANK + bank_code + account", () => {
    expect(buildAccountValidationBody(NG_INPUT)).toEqual({
      country: "NG",
      account_type: "BANK",
      bank_code: "058",
      account: "0036123456",
    })
  })

  it("throws UNSUPPORTED_CAPABILITY (no field detail) for an unsupported country", () => {
    expect(() => buildAccountValidationBody({ ...NG_INPUT, countryCode: "KE" })).toThrow(
      expect.objectContaining({ name: "ProviderError", category: "UNSUPPORTED_CAPABILITY" }),
    )
  })

  it("throws INVALID_REQUEST(fieldValidation) when a required field is missing", () => {
    expect(() => buildAccountValidationBody({ ...NG_INPUT, bankCode: "" })).toThrow(
      expect.objectContaining({ category: "INVALID_REQUEST", context: expect.objectContaining({ fieldValidation: true }) }),
    )
  })

  it("never puts the account number into the thrown error", () => {
    try {
      buildAccountValidationBody({ ...NG_INPUT, countryCode: "ZZ" })
    } catch (err) {
      expect(String((err as Error).message)).not.toContain("0036123456")
    }
  })
})

describe("dLocal account validation — response parsing", () => {
  it("normalizes a 1000 success (string status) with full_name", () => {
    const out = parseAccountValidationResponse(
      200,
      { id: "PAV-abc", status: "1000", message: "Successful validation", full_name: "ANDREW GATES" },
      NG_INPUT,
    )
    expect(out).toEqual({ accountNumber: "0036123456", accountName: "ANDREW GATES", bankCode: "058" })
  })

  it("normalizes a 1000 success expressed as status_code (int) + status_message", () => {
    const out = parseAccountValidationResponse(
      200,
      { status_code: 1000, status_message: "Successful validation", full_name: "JOHN ABADIE" },
      NG_INPUT,
    )
    expect(out.accountName).toBe("JOHN ABADIE")
  })

  it("falls back to the sent account number when dLocal doesn't echo it", () => {
    const out = parseAccountValidationResponse(200, { status: "1000", full_name: "X" }, NG_INPUT)
    expect(out.accountNumber).toBe("0036123456")
  })

  it("maps a 'did not pass validation' code (1011) to TRANSACTION_DECLINED", () => {
    expect(() =>
      parseAccountValidationResponse(400, { code: "1011", message: "Account details did not pass validation" }, NG_INPUT),
    ).toThrow(expect.objectContaining({ category: "TRANSACTION_DECLINED" }))
  })

  it("maps bad-account-format (1013) and invalid-bank-details (1014) to TRANSACTION_DECLINED", () => {
    for (const code of ["1013", "1014", "1015", "1016"]) {
      expect(() => parseAccountValidationResponse(400, { code, message: "x" }, NG_INPUT)).toThrow(
        expect.objectContaining({ category: "TRANSACTION_DECLINED" }),
      )
    }
  })

  it("maps country-validation failure (1006) to UNSUPPORTED_CAPABILITY", () => {
    expect(() => parseAccountValidationResponse(400, { code: "1006", message: "country" }, NG_INPUT)).toThrow(
      expect.objectContaining({ category: "UNSUPPORTED_CAPABILITY" }),
    )
  })

  it("maps a technical issue (1007) to PROVIDER_UNAVAILABLE", () => {
    expect(() => parseAccountValidationResponse(400, { code: "1007", message: "technical" }, NG_INPUT)).toThrow(
      expect.objectContaining({ category: "PROVIDER_UNAVAILABLE" }),
    )
  })

  it("maps an unknown 4xx body code to INVALID_REQUEST (ambiguous — a human decides)", () => {
    expect(() => parseAccountValidationResponse(400, { code: "9999", message: "?" }, NG_INPUT)).toThrow(
      expect.objectContaining({ category: "INVALID_REQUEST" }),
    )
  })

  it("maps HTTP 401/403 to AUTHENTICATION regardless of body", () => {
    for (const s of [401, 403]) {
      expect(() => parseAccountValidationResponse(s, {}, NG_INPUT)).toThrow(
        expect.objectContaining({ category: "AUTHENTICATION" }),
      )
    }
  })

  it("maps HTTP 429 to RATE_LIMIT and 5xx to PROVIDER_UNAVAILABLE", () => {
    expect(() => parseAccountValidationResponse(429, {}, NG_INPUT)).toThrow(
      expect.objectContaining({ category: "RATE_LIMIT" }),
    )
    expect(() => parseAccountValidationResponse(503, {}, NG_INPUT)).toThrow(
      expect.objectContaining({ category: "PROVIDER_UNAVAILABLE" }),
    )
  })

  it("treats HTTP 200 with a non-1000 body status as a failure", () => {
    expect(() => parseAccountValidationResponse(200, { status: "1011", message: "bad" }, NG_INPUT)).toThrow(
      expect.objectContaining({ category: "TRANSACTION_DECLINED" }),
    )
  })

  it("never leaks the account number/bank code into a thrown error", () => {
    try {
      parseAccountValidationResponse(400, { code: "1011", message: "x" }, NG_INPUT)
    } catch (err) {
      const s = JSON.stringify(err instanceof Error ? { m: err.message, ...(err as object) } : err)
      expect(s).not.toContain("0036123456")
      expect(s).not.toContain("058")
    }
  })
})
