/*
 * dLocal constants. Everything provider-specific about "where" and "which
 * API version" lives here and in the sibling files — never in the finance
 * domain.
 *
 * dLocal's account-validation endpoint (POST /payouts/validation/external-account)
 * is part of dLocal's classic ("Payins"/legacy) API surface: API version
 * 2.1, HMAC-SHA256 request signing (X-Login + X-Trans-Key + a signed
 * Authorization header) — NOT the OAuth2 client-credentials flow the newer
 * Payouts v3 API uses. See dlocal.signature.ts.
 *   docs.dlocal.com/reference/account-validation
 *   docs.dlocal.com/reference/payins-security
 *   docs.dlocal.com/reference/environment
 */

export const DLOCAL_PROVIDER_CODE = "DLOCAL"

/**
 * API base URL per environment (verified against docs.dlocal.com/reference/environment).
 * `TEST` → sandbox, `LIVE` → production. Chosen by the provider account's
 * `environment`, NEVER hard-coded to one. Overridable per account via the
 * resolved secret bundle key `baseUrl` for the rare case dLocal moves a host.
 */
export const DLOCAL_API_BASE_URL: Record<"TEST" | "LIVE", string> = {
  TEST: "https://sandbox.dlocal.com",
  LIVE: "https://api.dlocal.com",
}

/** dLocal classic-API version header value for the account-validation endpoint. */
export const DLOCAL_API_VERSION = "2.1"

/** Path of the account-validation (bank-account resolution) endpoint. */
export const DLOCAL_ACCOUNT_VALIDATION_PATH = "/payouts/validation/external-account"

/** Sent as User-Agent so dLocal can identify our integration in their logs. */
export const DLOCAL_USER_AGENT = "DailyBread-Finance/1.0"

/** Per-request timeout for dLocal HTTP calls. */
export const DLOCAL_HTTP_TIMEOUT_MS = 20_000
