/*
 * dLocal account validation — the provider-specific request mapping and
 * response/error interpretation for POST /payouts/validation/external-account.
 * Everything dLocal-shaped lives here; the adapter just wires this to the
 * HTTP seam and the finance domain only ever sees NormalizedBankAccount /
 * ProviderError.
 *
 * dLocal's account-validation endpoint is COUNTRY-keyed: `country` (ISO
 * 3166-1 alpha-2) and `account_type` are always required, and each country
 * has its own field/format requirements (docs.dlocal.com/reference/account-validation).
 * It is NOT globally available — dLocal documents it for a fixed set of
 * countries only. The `DLOCAL_ACCOUNT_VALIDATION` table below is the single
 * source of truth for which countries this adapter supports and how to build
 * each one's request; a country outside it fails fast with
 * UNSUPPORTED_CAPABILITY before any network call (same pattern as the
 * Flutterwave adapter's currency guard).
 */

import { ProviderError, type ProviderErrorCategory } from "../provider.errors"
import type { NormalizedBankAccount, ResolveBankAccountInput } from "../provider.types"
import { DLOCAL_PROVIDER_CODE } from "./dlocal.constants"

//* ─── Per-country support + request mapping ──────────────────────────────

interface DlocalCountryRule {
  /** dLocal `account_type` value for a bank account in this country. */
  accountType: string
  /** Build the country-specific request body from our normalized input.
   *  Returns null if a field this country requires is absent — the caller
   *  turns that into an INVALID_REQUEST (fieldValidation) so the vendor can
   *  fix it, never a network call. */
  build(input: ResolveBankAccountInput): Record<string, string> | null
}

/**
 * Countries this adapter can validate today. Deliberately minimal — Nigeria
 * is the first operational market. Adding another dLocal-documented country
 * (Ghana needs `bank_branch` = BIC/SWIFT; Argentina/Costa Rica/Turkey take
 * just an IBAN/CBU in `account`; etc.) is a single entry here plus a mapping
 * from the normalized input — no adapter or finance-domain change.
 */
export const DLOCAL_ACCOUNT_VALIDATION: Record<string, DlocalCountryRule> = {
  NG: {
    accountType: "BANK",
    build(input) {
      const bankCode = input.bankCode?.trim()
      const account = input.accountNumber?.trim()
      if (!bankCode || !account) return null
      return { country: "NG", account_type: "BANK", bank_code: bankCode, account }
    },
  },
}

export function isDlocalSupportedCountry(countryCode: string): boolean {
  return countryCode.toUpperCase() in DLOCAL_ACCOUNT_VALIDATION
}

//* ─── Request ───────────────────────────────────────────────────────────

/**
 * Build the dLocal request body for `input`. Throws a ProviderError (no
 * network) when the country isn't supported (UNSUPPORTED_CAPABILITY) or a
 * required field for that country is missing (INVALID_REQUEST/fieldValidation).
 */
export function buildAccountValidationBody(input: ResolveBankAccountInput): Record<string, string> {
  const cc = input.countryCode?.trim().toUpperCase()
  const rule = cc ? DLOCAL_ACCOUNT_VALIDATION[cc] : undefined
  if (!rule) {
    throw new ProviderError(
      "UNSUPPORTED_CAPABILITY",
      `dLocal does not support bank-account validation for country "${cc || "?"}"`,
      DLOCAL_PROVIDER_CODE,
      { providerMessage: `account-validation country not supported: ${cc || "?"}` },
    )
  }
  const body = rule.build(input)
  if (!body) {
    throw new ProviderError(
      "INVALID_REQUEST",
      `Missing a required bank-account field for dLocal validation in ${cc}`,
      DLOCAL_PROVIDER_CODE,
      { providerMessage: `missing required field for ${cc}`, fieldValidation: true },
    )
  }
  return body
}

//* ─── Response ──────────────────────────────────────────────────────────

/** dLocal success is status/status_code === 1000 (string or int, per country). */
const DLOCAL_SUCCESS_CODE = "1000"

/*
 * dLocal account-validation error codes
 * (docs.dlocal.com/reference/account-validation-errors):
 *   1006 country parameter failed validation      -> we sent an unsupported country
 *   1007 technical issue during validation         -> transient, our-side review
 *   1011 account details did not pass validation   -> confirmed negative
 *   1012 bank branch information is incorrect       -> confirmed negative
 *   1013 account number format doesn't match        -> confirmed negative
 *   1014 bank account details are invalid           -> confirmed negative
 *   1015 bank routing / id code is wrong            -> confirmed negative
 *   1016 account category unsupported               -> confirmed negative
 *   1017 wallet mobile/email rejected               -> confirmed negative
 *   1018 identification document unacceptable       -> bad request (we send none)
 *   1019 document category type not recognised      -> bad request (we send none)
 */
const DECLINED_CODES = new Set(["1011", "1012", "1013", "1014", "1015", "1016", "1017"])

function categoryForDlocalCode(code: string): ProviderErrorCategory {
  if (code === "1006") return "UNSUPPORTED_CAPABILITY"
  if (code === "1007") return "PROVIDER_UNAVAILABLE"
  if (DECLINED_CODES.has(code)) return "TRANSACTION_DECLINED"
  if (code === "1018" || code === "1019") return "INVALID_REQUEST"
  return "INVALID_REQUEST"
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === "string" && v.trim()) return v.trim()
    if (typeof v === "number") return String(v)
  }
  return undefined
}

/**
 * Interpret a dLocal HTTP response. Returns a NormalizedBankAccount on a
 * confirmed 1000, throws a ProviderError otherwise. The account number/bank
 * code are NEVER put into the error — only a safe provider code/message.
 */
export function parseAccountValidationResponse(
  status: number,
  body: unknown,
  input: ResolveBankAccountInput,
): NormalizedBankAccount {
  const b = (body ?? {}) as Record<string, unknown>
  const statusCode = pickString(b, "status", "status_code", "code")
  const message = pickString(b, "message", "status_message")

  // Success: HTTP 2xx AND the body status is 1000.
  if (status >= 200 && status < 300 && statusCode === DLOCAL_SUCCESS_CODE) {
    return {
      // dLocal doesn't echo the account number on success for most countries
      // — fall back to what we sent (same as the Flutterwave adapter).
      accountNumber: pickString(b, "account", "account_number") ?? input.accountNumber,
      accountName: pickString(b, "full_name") ?? "",
      bankCode: input.bankCode,
    }
  }

  // Transport / auth / throttle failures take precedence over any body code.
  if (status === 401 || status === 403) {
    throw new ProviderError("AUTHENTICATION", "dLocal rejected our credentials", DLOCAL_PROVIDER_CODE, {
      httpStatus: status,
    })
  }
  if (status === 429) {
    throw new ProviderError("RATE_LIMIT", "dLocal is rate limiting requests", DLOCAL_PROVIDER_CODE, {
      httpStatus: status,
    })
  }
  if (status >= 500) {
    throw new ProviderError("PROVIDER_UNAVAILABLE", "dLocal is temporarily unavailable", DLOCAL_PROVIDER_CODE, {
      httpStatus: status,
    })
  }

  // A body error code (either an HTTP 4xx body, or a 200 with a non-1000
  // status). A documented "did not pass validation" code (1011–1017) is a
  // confirmed negative (TRANSACTION_DECLINED -> FAILED downstream); anything
  // else 4xx is treated as an ambiguous rejection (INVALID_REQUEST, no
  // field detail -> REQUIRES_REVIEW downstream, a human decides).
  const category = statusCode ? categoryForDlocalCode(statusCode) : "INVALID_REQUEST"
  throw new ProviderError(category, `dLocal account validation failed (${status})`, DLOCAL_PROVIDER_CODE, {
    httpStatus: status,
    // Safe: a dLocal status code + its generic message. Never account data.
    providerMessage: [statusCode, message].filter(Boolean).join(": ") || undefined,
  })
}
