import { describe, it, expect } from "vitest"
import { isValidCurrencyCodeFormat, normaliseCurrencyCode, isValidMinorUnitDigits } from "./currency"
// Cross-package import of the pure (zero-dependency) seed data array, so
// the "minor-unit metadata is correct" invariant is checked against the
// actual rows that get seeded — not a copy.
import { CURRENCIES } from "../../../../../../packages/database/src/seed/finance/data/currencies.data"

describe("currency-code convention", () => {
  it("accepts exactly 3 uppercase letters", () => {
    expect(isValidCurrencyCodeFormat("KES")).toBe(true)
    expect(isValidCurrencyCodeFormat("USD")).toBe(true)
  })

  it("rejects anything else", () => {
    expect(isValidCurrencyCodeFormat("kes")).toBe(false)
    expect(isValidCurrencyCodeFormat("KESH")).toBe(false)
    expect(isValidCurrencyCodeFormat("K1S")).toBe(false)
    expect(isValidCurrencyCodeFormat("")).toBe(false)
  })

  it("normalises user input", () => {
    expect(normaliseCurrencyCode("  kes ")).toBe("KES")
  })
})

describe("minor-unit digits", () => {
  it("allows only the values ISO-4217 actually uses", () => {
    expect(isValidMinorUnitDigits(0)).toBe(true)
    expect(isValidMinorUnitDigits(2)).toBe(true)
    expect(isValidMinorUnitDigits(3)).toBe(true)
    expect(isValidMinorUnitDigits(4)).toBe(true)
    expect(isValidMinorUnitDigits(1)).toBe(false)
    expect(isValidMinorUnitDigits(5)).toBe(false)
    expect(isValidMinorUnitDigits(2.5)).toBe(false)
  })
})

describe("seeded currency reference data", () => {
  it("every seeded code is a valid ISO-4217 alpha code and unique", () => {
    const codes = CURRENCIES.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const c of CURRENCIES) expect(isValidCurrencyCodeFormat(c.code)).toBe(true)
  })

  it("every seeded minorUnitDigits is a permitted value", () => {
    for (const c of CURRENCIES) {
      expect(isValidMinorUnitDigits(c.minorUnitDigits), `${c.code} has minorUnitDigits ${c.minorUnitDigits}`).toBe(true)
    }
  })

  it("known 0-digit currencies are seeded as 0, not defaulted to 2", () => {
    const byCode = new Map(CURRENCIES.map((c) => [c.code, c.minorUnitDigits]))
    expect(byCode.get("UGX")).toBe(0)
    expect(byCode.get("RWF")).toBe(0)
    expect(byCode.get("XOF")).toBe(0)
    expect(byCode.get("KES")).toBe(2)
    expect(byCode.get("USD")).toBe(2)
  })
})
