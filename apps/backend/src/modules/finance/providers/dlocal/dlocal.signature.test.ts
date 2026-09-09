import { describe, it, expect } from "vitest"
import { createHmac } from "node:crypto"
import { dlocalSignatureHex, dlocalAuthorizationHeader, dlocalDate } from "./dlocal.signature"

/*
 * dLocal's documented rule (docs.dlocal.com/reference/payins-security):
 *   signature = hmac_sha256_hex( secretKey, X-Login + X-Date + RequestBody )
 *   Authorization: "V2-HMAC-SHA256, Signature: <hex>"
 * Body-less requests omit the body part.
 */

describe("dLocal signature", () => {
  const xLogin = "merchant-login"
  const xDate = "2026-01-02T03:04:05.678Z"
  const secret = "s3cr3t-key"
  const body = '{"country":"NG","account_type":"BANK","bank_code":"058","account":"0036123456"}'

  it("signs X-Login + X-Date + body with HMAC-SHA256, lowercase hex", () => {
    const expected = createHmac("sha256", secret).update(`${xLogin}${xDate}${body}`, "utf8").digest("hex")
    expect(dlocalSignatureHex(xLogin, xDate, secret, body)).toBe(expected)
    expect(dlocalSignatureHex(xLogin, xDate, secret, body)).toMatch(/^[0-9a-f]{64}$/)
  })

  it("omits the body part for a body-less request (X-Login + X-Date only)", () => {
    const expected = createHmac("sha256", secret).update(`${xLogin}${xDate}`, "utf8").digest("hex")
    expect(dlocalSignatureHex(xLogin, xDate, secret)).toBe(expected)
  })

  it("changes when any input changes (key, login, date, or body)", () => {
    const base = dlocalSignatureHex(xLogin, xDate, secret, body)
    expect(dlocalSignatureHex(xLogin, xDate, "other", body)).not.toBe(base)
    expect(dlocalSignatureHex("other", xDate, secret, body)).not.toBe(base)
    expect(dlocalSignatureHex(xLogin, "2026-01-02T03:04:05.679Z", secret, body)).not.toBe(base)
    expect(dlocalSignatureHex(xLogin, xDate, secret, body + " ")).not.toBe(base)
  })

  it("wraps the hex in the documented Authorization header format", () => {
    const header = dlocalAuthorizationHeader(xLogin, xDate, secret, body)
    expect(header).toBe(`V2-HMAC-SHA256, Signature: ${dlocalSignatureHex(xLogin, xDate, secret, body)}`)
  })

  it("dlocalDate is an ISO-8601 UTC timestamp with millis and trailing Z", () => {
    expect(dlocalDate(new Date("2026-01-02T03:04:05.678Z"))).toBe("2026-01-02T03:04:05.678Z")
    expect(dlocalDate()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })
})
