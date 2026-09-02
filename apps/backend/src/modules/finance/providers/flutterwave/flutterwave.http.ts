/*
 * Tiny HTTP seam for the Flutterwave adapter. An interface + a `fetch`-based
 * implementation, so every unit test injects a fake and NO test ever touches
 * the network (or the real Flutterwave API).
 *
 * Transport-level failures (DNS, connection reset, abort/timeout) are
 * normalized to ProviderError here; HTTP responses (any status) are returned
 * to the caller, which decides what a given status means for that endpoint.
 */

import { ProviderError } from "../provider.errors"
import { FLUTTERWAVE_HTTP_TIMEOUT_MS } from "./flutterwave.constants"

export interface FlutterwaveHttpRequest {
  method: "GET" | "POST" | "PUT" | "PATCH"
  url: string
  headers: Record<string, string>
  /** JSON body — serialized by the client. */
  json?: unknown
  /** Form body (application/x-www-form-urlencoded) — used only by the token call. */
  form?: Record<string, string>
  timeoutMs?: number
}

export interface FlutterwaveHttpResponse {
  status: number
  /** Parsed JSON body, or null if the body was empty / not JSON. */
  body: unknown
}

export interface FlutterwaveHttpClient {
  request(req: FlutterwaveHttpRequest): Promise<FlutterwaveHttpResponse>
}

const PROVIDER = "FLUTTERWAVE"

export const fetchFlutterwaveHttpClient: FlutterwaveHttpClient = {
  async request(req: FlutterwaveHttpRequest): Promise<FlutterwaveHttpResponse> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? FLUTTERWAVE_HTTP_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(req.url, {
        method: req.method,
        headers: req.form
          ? { ...req.headers, "content-type": "application/x-www-form-urlencoded" }
          : { ...req.headers, "content-type": "application/json" },
        body: req.form
          ? new URLSearchParams(req.form).toString()
          : req.json !== undefined
            ? JSON.stringify(req.json)
            : undefined,
        signal: controller.signal,
      })
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderError("TIMEOUT", "Flutterwave request timed out", PROVIDER)
      }
      throw new ProviderError("PROVIDER_UNAVAILABLE", "Could not reach Flutterwave", PROVIDER, {
        providerMessage: err instanceof Error ? err.name : "network error",
      })
    } finally {
      clearTimeout(timeout)
    }

    const text = await res.text()
    let body: unknown = null
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = null
      }
    }
    return { status: res.status, body }
  },
}
