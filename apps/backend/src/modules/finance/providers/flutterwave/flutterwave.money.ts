/*
 * Flutterwave amount <-> DailyBread Money conversion.
 *
 * Flutterwave's API speaks MAJOR units ("amount": 250 == KES 250.00).
 * DailyBread Money is integer MINOR units. The conversion needs the
 * currency's minor-unit exponent — this file carries a small table for the
 * currencies Flutterwave actually settles in (that's provider-specific
 * knowledge, so it lives in the adapter, not lib/currency.ts which
 * deliberately ships no ISO table). Unknown code => assume 2 (the common case).
 */

import { money, type Money } from "../../lib/money"

/** Currencies Flutterwave supports that are NOT 2-decimal. Everything else: 2. */
const ZERO_DECIMAL = new Set(["UGX", "RWF", "XOF", "XAF", "BIF", "DJF", "GNF", "KMF", "XPF", "JPY", "KRW", "VUV", "CLP", "PYG"])
const THREE_DECIMAL = new Set(["BHD", "KWD", "OMR", "TND", "IQD", "JOD", "LYD"])

export function minorUnitDigitsFor(currency: string): number {
  const c = currency.trim().toUpperCase()
  if (ZERO_DECIMAL.has(c)) return 0
  if (THREE_DECIMAL.has(c)) return 3
  return 2
}

/** Flutterwave major-unit number -> DailyBread Money (integer minor units). */
export function flutterwaveAmountToMoney(major: number | string, currency: string): Money {
  const value = typeof major === "string" ? Number(major) : major
  const code = currency.trim().toUpperCase()
  if (!Number.isFinite(value)) {
    return money(0, code)
  }
  const factor = 10 ** minorUnitDigitsFor(code)
  return money(Math.round(value * factor), code)
}

/** DailyBread Money -> the major-unit number Flutterwave expects in a request. */
export function moneyToFlutterwaveAmount(m: Money): number {
  return m.amountMinor / 10 ** minorUnitDigitsFor(m.currency)
}
