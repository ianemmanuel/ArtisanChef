/*
 * dLocal request signing (classic / "Payins" scheme, API version 2.1).
 *
 * Every request carries these headers (docs.dlocal.com/reference/payins-security):
 *   X-Date        ISO-8601 UTC, e.g. 2018-07-12T13:46:28.629Z
 *   X-Login       merchant identifier
 *   X-Trans-Key   paired auth credential
 *   X-Version     2.1
 *   User-Agent    our integration id
 *   Content-Type  application/json
 *   Authorization V2-HMAC-SHA256, Signature: <sig>
 *
 * where <sig> = hmac_sha256_hex( secretKey, X-Login + X-Date + RequestBody )
 * — the three parts concatenated with NO separator, lowercase hex output.
 * For a body-less request the body part is simply omitted; account
 * validation is always POST-with-body so that branch isn't used here, but
 * `body` is optional to keep the function faithful to the documented rule.
 *
 * Pure + dependency-free (node:crypto only) so it's exhaustively unit
 * testable without touching the network or the adapter.
 */

import { createHmac } from "node:crypto"

export const DLOCAL_AUTH_PREFIX = "V2-HMAC-SHA256"

/** ISO-8601 timestamp in the exact shape dLocal documents (millis + `Z`). */
export function dlocalDate(now: Date = new Date()): string {
  return now.toISOString()
}

/** The lowercase-hex HMAC-SHA256 signature over `xLogin + xDate + body`. */
export function dlocalSignatureHex(xLogin: string, xDate: string, secretKey: string, body = ""): string {
  return createHmac("sha256", secretKey)
    .update(`${xLogin}${xDate}${body}`, "utf8")
    .digest("hex")
}

/** The full value for the `Authorization` header. */
export function dlocalAuthorizationHeader(
  xLogin: string,
  xDate: string,
  secretKey: string,
  body = "",
): string {
  return `${DLOCAL_AUTH_PREFIX}, Signature: ${dlocalSignatureHex(xLogin, xDate, secretKey, body)}`
}
