/*
 * Flutterwave v4 webhook: signature verification + payload normalization.
 * Both are PURE and independently testable — no DB, no env, no network.
 *
 * v4 signs each delivery with the header `flutterwave-signature`, computed
 * as base64( HMAC-SHA256( secretHash, rawBody ) ). Some (older-dashboard)
 * setups instead send `verif-hash` equal to the plain secret hash. Both are
 * accepted; comparison is constant-time.
 *
 * The raw body MUST be the exact bytes received (Express `express.raw`) —
 * a re-serialized JSON object will not match the HMAC.
 */

import crypto from "node:crypto"
import type { NormalizedWebhookEvent } from "../provider.types"
import { flutterwaveAmountToMoney } from "./flutterwave.money"
import { mapWebhookEventType } from "./flutterwave.mappers"
import { FLUTTERWAVE_SIGNATURE_HEADER } from "./flutterwave.constants"

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

function headerValue(headers: Record<string, string | undefined>, name: string): string | undefined {
  // Express lowercases header names; be defensive anyway.
  const direct = headers[name] ?? headers[name.toLowerCase()]
  if (direct) return direct
  const hit = Object.entries(headers).find(([k]) => k.toLowerCase() === name.toLowerCase())
  return hit?.[1]
}

/**
 * True iff the request is a genuine Flutterwave delivery signed with
 * `secretHash`. Never throws.
 */
export function verifyFlutterwaveSignature(
  rawBody: string,
  headers: Record<string, string | undefined>,
  secretHash: string,
): boolean {
  if (!secretHash) return false

  const v4 = headerValue(headers, FLUTTERWAVE_SIGNATURE_HEADER)
  if (v4) {
    const expected = crypto.createHmac("sha256", secretHash).update(rawBody, "utf8").digest("base64")
    const expectedHex = crypto.createHmac("sha256", secretHash).update(rawBody, "utf8").digest("hex")
    return timingSafeEqual(v4, expected) || timingSafeEqual(v4, expectedHex)
  }

  const legacy = headerValue(headers, "verif-hash")
  if (legacy) {
    return timingSafeEqual(legacy, secretHash)
  }

  return false
}

interface FlutterwaveWebhookBody {
  id?: string | number
  event?: string
  type?: string
  "event.type"?: string
  timestamp?: number | string
  data?: Record<string, unknown>
}

function pickRef(data: Record<string, unknown>): string | null {
  const candidates = [data.id, data.flw_ref, data.reference, data.tx_ref, data.charge_id, data.transfer_id]
  for (const c of candidates) {
    if (c != null && String(c).length > 0) return String(c)
  }
  return null
}

/**
 * Parse a VERIFIED raw body into a normalized event. Tolerant of shape
 * drift — anything it can't classify becomes type `UNKNOWN` with whatever
 * ids it could find, never an exception (a webhook must always be ack-able).
 */
export function parseFlutterwaveEvent(rawBody: string): NormalizedWebhookEvent {
  let body: FlutterwaveWebhookBody
  try {
    body = JSON.parse(rawBody) as FlutterwaveWebhookBody
  } catch {
    return { type: "UNKNOWN", providerRef: null, providerEventId: null, raw: rawBody }
  }

  const data = (body.data ?? {}) as Record<string, unknown>
  const eventType = body.type ?? body.event ?? body["event.type"] ?? ""
  const dataStatus = data.status ?? data.state
  const type = mapWebhookEventType(eventType, dataStatus)

  const providerEventId =
    body.id != null && String(body.id).length > 0 ? String(body.id) : pickRef(data)

  let amount: NormalizedWebhookEvent["amount"]
  if (data.amount != null && typeof data.currency === "string") {
    try {
      amount = flutterwaveAmountToMoney(data.amount as number | string, data.currency)
    } catch {
      amount = undefined
    }
  }

  const ts = body.timestamp
  const occurredAt =
    ts != null && Number.isFinite(Number(ts)) ? new Date(Number(ts) > 1e12 ? Number(ts) : Number(ts) * 1000) : undefined

  return {
    type,
    providerRef: pickRef(data),
    providerEventId,
    providerStatus: dataStatus != null ? String(dataStatus) : undefined,
    amount,
    occurredAt,
    raw: body,
  }
}
