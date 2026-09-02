import { describe, it, expect } from "vitest"
import {
  money,
  add,
  subtract,
  sum,
  compare,
  assertSameCurrency,
  isMoney,
  formatMinor,
  MoneyError,
} from "./money"

describe("Money — construction", () => {
  it("accepts an integer minor amount + a 3-letter currency", () => {
    expect(money(10000, "KES")).toEqual({ amountMinor: 10000, currency: "KES" })
    expect(money(0, "USD")).toEqual({ amountMinor: 0, currency: "USD" })
    expect(money(-500, "UGX")).toEqual({ amountMinor: -500, currency: "UGX" })
  })

  it("rejects non-integer (float) amounts — no floating-point money", () => {
    expect(() => money(100.5, "KES")).toThrow(MoneyError)
    expect(() => money(0.1 + 0.2, "KES")).toThrow(MoneyError)
    expect(() => money(NaN, "KES")).toThrow(MoneyError)
  })

  it("rejects amounts outside the safe integer range", () => {
    expect(() => money(Number.MAX_SAFE_INTEGER + 1, "KES")).toThrow(MoneyError)
  })

  it("rejects malformed currency codes", () => {
    expect(() => money(100, "kes")).toThrow(MoneyError)
    expect(() => money(100, "KESH")).toThrow(MoneyError)
    expect(() => money(100, "K$")).toThrow(MoneyError)
    expect(() => money(100, "")).toThrow(MoneyError)
  })
})

describe("Money — arithmetic", () => {
  it("adds and subtracts within the same currency", () => {
    expect(add(money(1000, "KES"), money(250, "KES"))).toEqual({ amountMinor: 1250, currency: "KES" })
    expect(subtract(money(1000, "KES"), money(250, "KES"))).toEqual({ amountMinor: 750, currency: "KES" })
  })

  it("rejects cross-currency arithmetic", () => {
    expect(() => add(money(1000, "KES"), money(1000, "UGX"))).toThrow(/Currency mismatch/)
    expect(() => subtract(money(1000, "KES"), money(1000, "USD"))).toThrow(MoneyError)
    expect(() => assertSameCurrency(money(1, "KES"), money(1, "USD"))).toThrow()
  })

  it("sum() rejects an empty list (no currency to attribute)", () => {
    expect(() => sum([])).toThrow(MoneyError)
    expect(sum([money(100, "KES"), money(200, "KES"), money(300, "KES")])).toEqual({ amountMinor: 600, currency: "KES" })
  })

  it("compare() is same-currency only", () => {
    expect(compare(money(100, "KES"), money(200, "KES"))).toBe(-1)
    expect(compare(money(200, "KES"), money(200, "KES"))).toBe(0)
    expect(() => compare(money(100, "KES"), money(100, "USD"))).toThrow()
  })

  it("per-meal allocation stays exact in integer minor units", () => {
    // KES 10,000.00 over 10 meals -> KES 1,000.00 each, 20% commission
    const planTotal = money(1_000_000, "KES")
    const perMeal = money(planTotal.amountMinor / 10, "KES")
    expect(perMeal.amountMinor).toBe(100_000)
    const commission = money(Math.round(perMeal.amountMinor * 0.2), "KES")
    const vendorNet = subtract(perMeal, commission)
    expect(commission.amountMinor).toBe(20_000)
    expect(vendorNet.amountMinor).toBe(80_000)
    expect(sum(Array.from({ length: 10 }, () => perMeal)).amountMinor).toBe(planTotal.amountMinor)
  })
})

describe("Money — helpers", () => {
  it("isMoney() guards the shape", () => {
    expect(isMoney({ amountMinor: 100, currency: "KES" })).toBe(true)
    expect(isMoney({ amountMinor: 1.5, currency: "KES" })).toBe(false)
    expect(isMoney({ amountMinor: 100, currency: "kes" })).toBe(false)
    expect(isMoney(null)).toBe(false)
    expect(isMoney(100)).toBe(false)
  })

  it("formatMinor() honours the currency's own minor-unit digits", () => {
    expect(formatMinor(money(123456, "KES"), 2)).toBe("1234.56 KES")
    expect(formatMinor(money(123456, "UGX"), 0)).toBe("123456 UGX")
    expect(formatMinor(money(1234567, "BHD"), 3)).toBe("1234.567 BHD")
    expect(formatMinor(money(-5, "USD"), 2)).toBe("-0.05 USD")
  })
})
