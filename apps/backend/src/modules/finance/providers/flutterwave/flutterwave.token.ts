/*
 * Flutterwave v4 OAuth 2.0 client-credentials token manager.
 *
 * The finance domain never sees any of this — it asks the adapter for a
 * capability; the adapter asks this manager for a bearer token. Tokens are
 * cached in-memory per client id and refreshed shortly before they expire
 * (Flutterwave tokens live ~10 min).
 *
 * Stateless w.r.t. the DB/env: credentials arrive per call.
 */

import { ProviderError } from "../provider.errors"
import type { FlutterwaveHttpClient } from "./flutterwave.http"
import type { FlutterwaveCredentials } from "./flutterwave.credentials"
import {
  FLUTTERWAVE_IDP_TOKEN_URL,
  FLUTTERWAVE_PROVIDER_CODE,
  FLUTTERWAVE_TOKEN_REFRESH_SKEW_MS,
} from "./flutterwave.constants"

interface CachedToken {
  token: string
  /** epoch ms after which the token must be refreshed (already skew-adjusted). */
  refreshAfter: number
}

interface TokenResponse {
  access_token?: string
  expires_in?: number
  token_type?: string
}

export class FlutterwaveTokenManager {
  private readonly cache = new Map<string, CachedToken>()

  constructor(private readonly http: FlutterwaveHttpClient) {}

  /** Test/lifecycle helper. */
  clear(): void {
    this.cache.clear()
  }

  async getToken(creds: FlutterwaveCredentials, traceId?: string): Promise<string> {
    const key = creds.idpUrl ? `${creds.idpUrl}::${creds.clientId}` : creds.clientId
    const cached = this.cache.get(key)
    if (cached && Date.now() < cached.refreshAfter) {
      return cached.token
    }

    const res = await this.http.request({
      method: "POST",
      url: creds.idpUrl || FLUTTERWAVE_IDP_TOKEN_URL,
      headers: traceId ? { "x-trace-id": traceId } : {},
      form: {
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        grant_type: "client_credentials",
      },
    })

    if (res.status === 401 || res.status === 403 || res.status === 400) {
      throw new ProviderError(
        "AUTHENTICATION",
        "Flutterwave rejected the client credentials",
        FLUTTERWAVE_PROVIDER_CODE,
        { httpStatus: res.status },
      )
    }
    if (res.status >= 500) {
      throw new ProviderError(
        "PROVIDER_UNAVAILABLE",
        "Flutterwave token endpoint is unavailable",
        FLUTTERWAVE_PROVIDER_CODE,
        { httpStatus: res.status },
      )
    }

    const body = (res.body ?? {}) as TokenResponse
    if (!body.access_token) {
      throw new ProviderError(
        "AUTHENTICATION",
        "Flutterwave token response did not contain an access token",
        FLUTTERWAVE_PROVIDER_CODE,
        { httpStatus: res.status },
      )
    }

    const ttlMs = Math.max(30_000, (body.expires_in ?? 600) * 1000)
    this.cache.set(key, {
      token: body.access_token,
      refreshAfter: Date.now() + ttlMs - FLUTTERWAVE_TOKEN_REFRESH_SKEW_MS,
    })
    return body.access_token
  }
}
