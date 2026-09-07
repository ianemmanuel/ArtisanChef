/*
 * ProviderSecretsResolver — the abstraction that stands between the
 * finance domain and where provider credentials actually live.
 *
 * Provider API keys / secret keys / webhook signing secrets are NEVER
 * stored as ordinary DB columns. The DB stores only a non-secret
 * `secretAlias` (added in a later phase, on CountryProviderAccount); this
 * resolver turns that alias into the actual secret bundle.
 *
 * Phase 1A ships the env-backed implementation only. A real secret
 * manager (AWS Secrets Manager / Vault / Doppler) becomes a drop-in
 * alternative implementation later — nothing that consumes this interface
 * changes.
 *
 * Not wired anywhere yet (no CountryProviderAccount exists to carry an
 * alias). It exists so the boundary is defined before the first adapter.
 */

export interface ProviderSecrets {
  /** e.g. { secretKey, publicKey, encryptionKey, webhookSecret } — provider-specific keys. */
  [key: string]: string
}

export interface ProviderSecretsResolver {
  /**
   * @param alias non-secret reference stored on the provider-account row,
   *              e.g. "flutterwave_ke_primary"
   */
  resolve(alias: string): Promise<ProviderSecrets>
  /**
   * True if the alias resolves to AT LEAST ONE key right now. This stays
   * deliberately provider-agnostic — "is anything configured for this
   * alias". Whether the bundle is COMPLETE for a given provider (has the
   * keys that provider's credential reader needs) is asked of the adapter,
   * not here (finance.providerGateway.service → resolvedCredentialsComplete),
   * so the resolver never learns provider-specific key names.
   */
  has(alias: string): Promise<boolean>
}

export class ProviderSecretsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProviderSecretsError"
  }
}

/**
 * The non-secret alias for a country provider account is DERIVED, never
 * entered by an admin — it's a deterministic function of what the admin
 * already chose (provider + country + environment). The real credentials
 * live in the secret manager / .env under this alias (see the env
 * convention on EnvProviderSecretsResolver).
 *
 *   deriveProviderSecretAlias("FLUTTERWAVE", "KE", "TEST") -> "flutterwave_ke_test"
 *     -> FINANCE_PROVIDER_SECRET__FLUTTERWAVE_KE_TEST__CLIENTID = ...
 */
export function deriveProviderSecretAlias(
  providerCode: string,
  countryCode: string,
  environment: "TEST" | "LIVE",
): string {
  return [providerCode, countryCode, environment]
    .join("_")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

/**
 * Env-backed resolver. Convention:
 *
 *   FINANCE_PROVIDER_SECRET__<ALIAS_UPPER>__<KEY_UPPER> = <value>
 *
 * e.g. alias "flutterwave_ke_primary", key "secretKey":
 *   FINANCE_PROVIDER_SECRET__FLUTTERWAVE_KE_PRIMARY__SECRETKEY=FLWSECK-...
 *
 * `resolve` returns every key found for the alias; a caller that needs a
 * specific key asserts its presence itself (adapters will).
 */
export class EnvProviderSecretsResolver implements ProviderSecretsResolver {
  private readonly prefix = "FINANCE_PROVIDER_SECRET__"

  private aliasToken(alias: string): string {
    return alias.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_")
  }

  private collect(alias: string): ProviderSecrets {
    const needle = `${this.prefix}${this.aliasToken(alias)}__`
    const out: ProviderSecrets = {}
    for (const [envKey, value] of Object.entries(process.env)) {
      // An empty / whitespace-only var is treated as "not set" — a blank
      // placeholder in .env must not read as a configured credential.
      if (value == null || value.trim() === "" || !envKey.startsWith(needle)) continue
      const rawKey = envKey.slice(needle.length)
      // FINANCE_PROVIDER_SECRET__X__SECRETKEY -> "secretKey" (lower first char run)
      out[rawKey.toLowerCase()] = value
    }
    return out
  }

  async resolve(alias: string): Promise<ProviderSecrets> {
    const secrets = this.collect(alias)
    if (Object.keys(secrets).length === 0) {
      throw new ProviderSecretsError(
        `No provider secrets found for alias "${alias}" (expected env vars prefixed ${this.prefix}${this.aliasToken(alias)}__)`,
      )
    }
    return secrets
  }

  async has(alias: string): Promise<boolean> {
    return Object.keys(this.collect(alias)).length > 0
  }
}

/** The process-wide resolver. Swap the constructor here to change backends. */
export const providerSecretsResolver: ProviderSecretsResolver = new EnvProviderSecretsResolver()
