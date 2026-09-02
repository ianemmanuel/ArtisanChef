/*
 * Money — the ONE representation of a monetary amount in the finance
 * domain. An integer count of a currency's minor unit + the currency it
 * is denominated in. Never a float; never currency-less; never implicitly
 * converted.
 *
 * Deliberately a small set of pure functions over a plain object (not a
 * class) — matches this codebase's functional service style, and keeps it
 * trivially serialisable across the API boundary.
 *
 * This file has zero imports on purpose: it is the leaf of the finance
 * module and must stay unit-testable in isolation.
 */

export interface Money {
  /** Integer count of the currency's minor unit. e.g. 10000 === "KES 100.00". */
  amountMinor: number
  /** ISO-4217 code, uppercase. Must resolve to a Currency row at the service layer. */
  currency: string
}

export class MoneyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MoneyError"
  }
}

const CURRENCY_CODE_RE = /^[A-Z]{3}$/

function assertValidCurrencyToken(currency: string): void {
  if (typeof currency !== "string" || !CURRENCY_CODE_RE.test(currency)) {
    throw new MoneyError(`Invalid currency code: ${JSON.stringify(currency)} (expected 3 uppercase letters)`)
  }
}

function assertMinorUnitsInteger(amountMinor: number): void {
  if (typeof amountMinor !== "number" || !Number.isInteger(amountMinor)) {
    throw new MoneyError(`amountMinor must be an integer number of minor units, got ${JSON.stringify(amountMinor)}`)
  }
  if (!Number.isSafeInteger(amountMinor)) {
    throw new MoneyError(`amountMinor ${amountMinor} exceeds the safe integer range`)
  }
}

/** Construct a validated Money. The only sanctioned way to make one. */
export function money(amountMinor: number, currency: string): Money {
  assertMinorUnitsInteger(amountMinor)
  assertValidCurrencyToken(currency)
  return { amountMinor, currency }
}

export function isMoney(value: unknown): value is Money {
  if (typeof value !== "object" || value === null) return false
  const m = value as Record<string, unknown>
  return (
    typeof m.amountMinor === "number" &&
    Number.isInteger(m.amountMinor) &&
    typeof m.currency === "string" &&
    CURRENCY_CODE_RE.test(m.currency)
  )
}

export function isSameCurrency(a: Money, b: Money): boolean {
  return a.currency === b.currency
}

export function assertSameCurrency(a: Money, b: Money): void {
  if (!isSameCurrency(a, b)) {
    throw new MoneyError(`Currency mismatch: ${a.currency} vs ${b.currency} — cross-currency arithmetic is not allowed`)
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b)
  return money(a.amountMinor + b.amountMinor, a.currency)
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b)
  return money(a.amountMinor - b.amountMinor, a.currency)
}

export function sum(items: Money[]): Money {
  if (items.length === 0) throw new MoneyError("Cannot sum an empty list of Money — no currency to attribute the result to")
  return items.reduce((acc, m) => add(acc, m))
}

export function isZero(m: Money): boolean {
  return m.amountMinor === 0
}

export function isNegative(m: Money): boolean {
  return m.amountMinor < 0
}

export function isPositive(m: Money): boolean {
  return m.amountMinor > 0
}

/** -1 | 0 | 1 — same-currency only. */
export function compare(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b)
  if (a.amountMinor < b.amountMinor) return -1
  if (a.amountMinor > b.amountMinor) return 1
  return 0
}

/**
 * Format for display/logging only — never for arithmetic. `minorUnitDigits`
 * comes from the currency's Currency row (JPY=0, KES/USD=2, BHD=3), never
 * assumed to be 2.
 */
export function formatMinor(m: Money, minorUnitDigits: number): string {
  if (!Number.isInteger(minorUnitDigits) || minorUnitDigits < 0 || minorUnitDigits > 6) {
    throw new MoneyError(`Invalid minorUnitDigits: ${minorUnitDigits}`)
  }
  const sign = m.amountMinor < 0 ? "-" : ""
  const abs = Math.abs(m.amountMinor).toString().padStart(minorUnitDigits + 1, "0")
  const whole = abs.slice(0, abs.length - minorUnitDigits) || "0"
  const frac = minorUnitDigits > 0 ? "." + abs.slice(abs.length - minorUnitDigits) : ""
  return `${sign}${whole}${frac} ${m.currency}`
}
