/*
 * Flutterwave credential shape + reader. The provider-specific credential
 * NAMES (clientId / clientSecret / encryptionKey / webhookSecretHash) live
 * ONLY here — the finance domain and the generic ProviderSecretsResolver
 * never see them; they only deal in a `secretAlias` and an opaque
 * `Record<string,string>` bundle.
 *
 * The env-backed resolver lowercases every key, so the bundle arrives as
 * { clientid, clientsecret, encryptionkey, webhooksecrethash, ... }. This
 * reader is case-insensitive so the .env var casing doesn't matter.
 */

import { ProviderError } from "../provider.errors"
import { FLUTTERWAVE_PROVIDER_CODE } from "./flutterwave.constants"

export interface FlutterwaveCredentials {
  clientId: string
  clientSecret: string
  /**
   * Card-encryption key. Only required for flows that submit raw card data
   * (direct card charge). Not needed for hosted checkout / mobile money —
   * kept available but never forced into a request that doesn't use it.
   */
  encryptionKey?: string
  /** Webhook secret hash — the shared secret Flutterwave signs deliveries with. */
  webhookSecretHash?: string
  /** Optional per-account overrides for the two provider URLs. */
  baseUrl?: string
  idpUrl?: string
}

function lower(bundle: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(bundle)) out[k.toLowerCase()] = v
  return out
}

function require1(b: Record<string, string>, key: string, label: string): string {
  const v = b[key]?.trim()
  if (!v) {
    throw new ProviderError(
      "AUTHENTICATION",
      `Flutterwave credential "${label}" is missing for this provider account`,
      FLUTTERWAVE_PROVIDER_CODE,
      { providerMessage: `missing credential: ${label}` },
    )
  }
  return v
}

/**
 * Turn a resolved secret bundle into typed Flutterwave credentials, failing
 * clearly (AUTHENTICATION category) if a required key is absent. Never logs
 * or echoes any value.
 */
export function readFlutterwaveCredentials(bundle: Record<string, string>): FlutterwaveCredentials {
  const b = lower(bundle)
  return {
    clientId: require1(b, "clientid", "clientId"),
    clientSecret: require1(b, "clientsecret", "clientSecret"),
    encryptionKey: b["encryptionkey"]?.trim() || undefined,
    webhookSecretHash: b["webhooksecrethash"]?.trim() || undefined,
    baseUrl: b["baseurl"]?.trim() || undefined,
    idpUrl: b["idpurl"]?.trim() || undefined,
  }
}

/** Same as above but also asserts the webhook secret hash is present. */
export function readFlutterwaveWebhookSecret(bundle: Record<string, string>): string {
  const b = lower(bundle)
  return require1(b, "webhooksecrethash", "webhookSecretHash")
}
