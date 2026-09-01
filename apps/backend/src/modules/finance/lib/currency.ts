/*
 * Currency-code convention helpers. Pure, dependency-free — the DB-backed
 * "does this code resolve to a Currency row" check lives in
 * finance.currency.service.ts; this file only owns the shape rules.
 *
 * Our convention: an ISO-4217 alpha code is exactly 3 uppercase A–Z
 * letters. We do NOT ship the full ISO-4217 table here — a code is
 * "known" only if it exists in the Currency reference table.
 */

const ISO_4217_ALPHA_RE = /^[A-Z]{3}$/

/** Structural validity only — not "exists in our Currency table". */
export function isValidCurrencyCodeFormat(code: string): boolean {
  return typeof code === "string" && ISO_4217_ALPHA_RE.test(code)
}

/** Normalise user input to the canonical form we store/compare. */
export function normaliseCurrencyCode(code: string): string {
  return code.trim().toUpperCase()
}

/**
 * Minor-unit digits must be one of the values ISO-4217 actually uses:
 * 0 (JPY, UGX, RWF…), 2 (the vast majority), 3 (BHD, KWD, OMR…), or the
 * rare 4 (CLF, UYW). Anything else is a data-entry error.
 */
const ALLOWED_MINOR_UNIT_DIGITS = new Set([0, 2, 3, 4])

export function isValidMinorUnitDigits(digits: number): boolean {
  return Number.isInteger(digits) && ALLOWED_MINOR_UNIT_DIGITS.has(digits)
}
