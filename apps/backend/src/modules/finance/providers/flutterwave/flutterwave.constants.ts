/*
 * Flutterwave v4 constants. Everything provider-specific about "where" and
 * "how to authenticate" lives here and in the sibling files — never in the
 * finance domain.
 *
 * Flutterwave v4 (unlike the legacy v3 `FLWSECK-` secret-key model) uses
 * OAuth 2.0 client-credentials: POST client_id + client_secret to the IdP
 * token endpoint, get a short-lived bearer token, call the API with it.
 * See flutterwave.token.ts.
 */

export const FLUTTERWAVE_PROVIDER_CODE = "FLUTTERWAVE"

/**
 * OAuth 2.0 token endpoint (same host for sandbox + live; the client
 * credentials themselves are environment-specific). Overridable per account
 * via the resolved secret bundle key `idpUrl` for the rare case Flutterwave
 * moves it again.
 */
export const FLUTTERWAVE_IDP_TOKEN_URL =
  "https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token"

/**
 * API base URL per environment (Flutterwave v4, verified against
 * developer.flutterwave.com/docs/environments). `TEST` → sandbox,
 * `LIVE` → production. Chosen by the provider account's `environment`,
 * NEVER hard-coded to one. Overridable per account via the secret bundle
 * key `baseUrl`.
 */
export const FLUTTERWAVE_API_BASE_URL: Record<"TEST" | "LIVE", string> = {
  TEST: "https://developersandbox-api.flutterwave.com",
  LIVE: "https://f4bexperience.flutterwave.com",
}

/** Refresh the token this many ms before it actually expires. */
export const FLUTTERWAVE_TOKEN_REFRESH_SKEW_MS = 60_000

/** Per-request timeout for Flutterwave HTTP calls. */
export const FLUTTERWAVE_HTTP_TIMEOUT_MS = 20_000

/** Header Flutterwave signs webhook deliveries with (v4). */
export const FLUTTERWAVE_SIGNATURE_HEADER = "flutterwave-signature"
