import { describe, it, expect } from "vitest"
import crypto from "node:crypto"
import { verifyFlutterwaveSignature, parseFlutterwaveEvent } from "./flutterwave.webhook"

const SECRET = "test_secret_hash_value"

function sign(body: string, secret = SECRET): string {
  return crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64")
}

describe("verifyFlutterwaveSignature", () => {
  const body = JSON.stringify({ id: "evt_1", type: "charge.completed", data: { status: "succeeded" } })

  it("accepts a correctly HMAC-SHA256-signed body (flutterwave-signature header, base64)", () => {
    expect(verifyFlutterwaveSignature(body, { "flutterwave-signature": sign(body) }, SECRET)).toBe(true)
  })

  it("accepts the hex encoding too", () => {
    const hex = crypto.createHmac("sha256", SECRET).update(body).digest("hex")
    expect(verifyFlutterwaveSignature(body, { "flutterwave-signature": hex }, SECRET)).toBe(true)
  })

  it("accepts the legacy verif-hash (plain secret equality)", () => {
    expect(verifyFlutterwaveSignature(body, { "verif-hash": SECRET }, SECRET)).toBe(true)
  })

  it("rejects a body signed with the wrong secret", () => {
    expect(verifyFlutterwaveSignature(body, { "flutterwave-signature": sign(body, "wrong") }, SECRET)).toBe(false)
  })

  it("rejects a tampered body", () => {
    const sig = sign(body)
    const tampered = body.replace("succeeded", "failed")
    expect(verifyFlutterwaveSignature(tampered, { "flutterwave-signature": sig }, SECRET)).toBe(false)
  })

  it("rejects when no signature header is present", () => {
    expect(verifyFlutterwaveSignature(body, {}, SECRET)).toBe(false)
  })

  it("rejects when the configured secret is empty", () => {
    expect(verifyFlutterwaveSignature(body, { "flutterwave-signature": sign(body) }, "")).toBe(false)
  })

  it("is not fooled by a length-mismatched signature", () => {
    expect(verifyFlutterwaveSignature(body, { "flutterwave-signature": "short" }, SECRET)).toBe(false)
  })
})

describe("parseFlutterwaveEvent", () => {
  it("normalizes a successful charge", () => {
    const raw = JSON.stringify({
      id: "3949-evt",
      type: "charge.completed",
      timestamp: 1_700_000_000,
      data: { id: "chg_88", status: "succeeded", amount: 1500, currency: "KES", flw_ref: "FLW-REF-1" },
    })
    const evt = parseFlutterwaveEvent(raw)
    expect(evt.type).toBe("PAYMENT_SUCCEEDED")
    expect(evt.providerEventId).toBe("3949-evt")
    expect(evt.providerRef).toBe("chg_88")
    expect(evt.amount).toEqual({ amountMinor: 150000, currency: "KES" })
    expect(evt.providerStatus).toBe("succeeded")
    expect(evt.occurredAt?.getTime()).toBe(1_700_000_000 * 1000)
  })

  it("classifies a charge.completed carrying a failed status as PAYMENT_FAILED", () => {
    const raw = JSON.stringify({ id: "e2", type: "charge.completed", data: { id: "c2", status: "failed" } })
    expect(parseFlutterwaveEvent(raw).type).toBe("PAYMENT_FAILED")
  })

  it("normalizes a successful transfer/payout", () => {
    const raw = JSON.stringify({ id: "e3", type: "transfer.completed", data: { id: "trf_9", status: "SUCCESSFUL" } })
    const evt = parseFlutterwaveEvent(raw)
    expect(evt.type).toBe("PAYOUT_PAID")
    expect(evt.providerRef).toBe("trf_9")
  })

  it("maps an unknown event type to UNKNOWN without throwing", () => {
    const raw = JSON.stringify({ id: "e4", type: "something.weird", data: {} })
    expect(parseFlutterwaveEvent(raw).type).toBe("UNKNOWN")
  })

  it("returns UNKNOWN (never throws) on a malformed body", () => {
    const evt = parseFlutterwaveEvent("{ not json")
    expect(evt.type).toBe("UNKNOWN")
    expect(evt.providerEventId).toBeNull()
  })

  it("falls back to a data ref when there is no top-level event id", () => {
    const raw = JSON.stringify({ type: "charge.completed", data: { id: "chg_x", status: "succeeded" } })
    expect(parseFlutterwaveEvent(raw).providerEventId).toBe("chg_x")
  })
})
