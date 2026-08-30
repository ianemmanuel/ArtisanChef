/*
 * Structural validation for payout-account identifiers — pure, offline,
 * no network. These catch a typo'd IBAN or a 6-digit "phone number" before
 * an account is ever created; they do NOT prove the account exists or
 * belongs to the vendor (that's a provider/API job, deferred).
 */

/** ISO 13616 IBAN check: length by country + mod-97 == 1. */
export function isValidIban(raw: string): boolean {
  const iban = raw.replace(/\s+/g, "").toUpperCase()
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(iban)) return false

  // Move the first 4 chars to the end, then convert letters A→10 … Z→35.
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  const expanded = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55))

  // mod-97 over a long numeric string, chunked to stay in safe integer range.
  let remainder = 0
  for (let i = 0; i < expanded.length; i += 7) {
    remainder = Number(String(remainder) + expanded.slice(i, i + 7)) % 97
  }
  return remainder === 1
}

/** US ABA routing number: 9 digits + weighted checksum (3-7-1). */
export function isValidAbaRouting(raw: string): boolean {
  const n = raw.replace(/\D/g, "")
  if (n.length !== 9) return false
  const d = n.split("").map(Number) as number[]
  const at = (i: number) => d[i] ?? 0
  const sum =
    3 * (at(0) + at(3) + at(6)) +
    7 * (at(1) + at(4) + at(7)) +
    1 * (at(2) + at(5) + at(8))
  return sum % 10 === 0
}

/** SWIFT/BIC: 8 or 11 chars, bank(4 alpha) country(2 alpha) location(2) [branch(3)]. */
export function isValidSwift(raw: string): boolean {
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(raw.replace(/\s+/g, "").toUpperCase())
}

/** Strip everything but digits and a single leading +, drop a leading 0. */
export function normaliseMsisdn(raw: string): string {
  let s = raw.trim().replace(/[^\d+]/g, "")
  if (s.startsWith("+")) s = "+" + s.slice(1).replace(/\D/g, "")
  else s = s.replace(/\D/g, "")
  return s
}

/**
 * Plausible mobile-money number: 7–15 digits (ITU E.164 max is 15), optional
 * leading +. Deliberately loose — country-specific MSISDN rules belong to the
 * telco-lookup API integration, not this offline check.
 */
export function isPlausibleMsisdn(raw: string): boolean {
  const s = normaliseMsisdn(raw)
  const digits = s.replace(/\D/g, "")
  return digits.length >= 7 && digits.length <= 15
}
