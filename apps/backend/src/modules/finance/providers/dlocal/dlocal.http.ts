/*
 * Tiny HTTP seam for the dLocal adapter. An interface + a `fetch`-based
 * implementation, so every unit test injects a fake and NO test ever touches
 * the network (or the real dLocal API).
 *
 * dLocal's signature is computed over the EXACT request-body string, so the
 * client sends a caller-supplied `body` string verbatim — it never
 * re-serializes. Transport-level failures (DNS, reset, abort/timeout) are
 * normalized to ProviderError here; HTTP responses (any status) are returned
 * to the caller, which decides what a given status means.
 */

import { ProviderError } from "../provider.errors"
import { DLOCAL_HTTP_TIMEOUT_MS, DLOCAL_PROVIDER_CODE } from "./dlocal.constants"

export interface DlocalHttpRequest {
  method: "GET" | "POST"
  url: string
  headers: Record<string, string>
  /** Pre-serialized body string — sent verbatim (must match what was signed). */
  body?: string
  timeoutMs?: number
}

export interface DlocalHttpResponse {
  status: number
  /** Parsed JSON body, or null if the body was empty / not JSON. */
  body: unknown
}

export interface DlocalHttpClient {
  request(req: DlocalHttpRequest): Promise<DlocalHttpResponse>
}

export const fetchDlocalHttpClient: DlocalHttpClient = {
  async request(req: DlocalHttpRequest): Promise<DlocalHttpResponse> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? DLOCAL_HTTP_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
        signal: controller.signal,
      })
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderError("TIMEOUT", "dLocal request timed out", DLOCAL_PROVIDER_CODE)
      }
      throw new ProviderError("PROVIDER_UNAVAILABLE", "Could not reach dLocal", DLOCAL_PROVIDER_CODE, {
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
