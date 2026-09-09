/*
 * dLocal credential shape + reader. The provider-specific credential NAMES
 * (xLogin / xTransKey / secretKey) live ONLY here — the finance domain and
 * the generic ProviderSecretsResolver never see them; they only deal in a
 * `secretAlias` and an opaque Record<string,string> bundle.
 *
 * The env-backed resolver lowercases every key, so the bundle arrives as
 * { xlogin, xtranskey, secretkey, ... }. This reader is case-insensitive so
 * the .env var casing doesn't matter.
 *
 * dLocal issues these three from the Merchant Dashboard (Settings →
 * Integration), separately for Test and Live:
 *   - X-Login      : merchant identifier header
 *   - X-Trans-Key  : paired auth credential header
 *   - Secret Key   : the HMAC key that signs the Authorization header
 * (The Smartfields API key is a card-tokenisation credential — not used by
 *  account validation, so not read here.)
 */

import { ProviderError } from "../provider.errors"
import { DLOCAL_PROVIDER_CODE } from "./dlocal.constants"

export interface DlocalCredentials {
  xLogin: string
  xTransKey: string
  secretKey: string
  /** Optional per-account override of the API host. */
  baseUrl?: string
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
      `dLocal credential "${label}" is missing for this provider account`,
      DLOCAL_PROVIDER_CODE,
      { providerMessage: `missing credential: ${label}` },
    )
  }
  return v
}

/**
 * Turn a resolved secret bundle into typed dLocal credentials, failing
 * clearly (AUTHENTICATION category) if a required key is absent. Never logs
 * or echoes any value.
 */
export function readDlocalCredentials(bundle: Record<string, string>): DlocalCredentials {
  const b = lower(bundle)
  return {
    xLogin: require1(b, "xlogin", "xLogin"),
    xTransKey: require1(b, "xtranskey", "xTransKey"),
    secretKey: require1(b, "secretkey", "secretKey"),
    baseUrl: b["baseurl"]?.trim() || undefined,
  }
}

/** The secret-bundle keys dLocal's credential reader needs for any call. */
export const DLOCAL_REQUIRED_SECRET_KEYS = ["xLogin", "xTransKey", "secretKey"] as const
