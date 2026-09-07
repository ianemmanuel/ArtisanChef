/*
 * Provider currency adaptation — the ONE place the finance domain turns a
 * country's canonical currency (Country.currencyCode, an ISO-4217 alpha
 * code) into the representation a specific payment provider requires, and
 * decides whether that provider supports it.
 *
 * The country owns the currency; the admin never picks a second
 * provider-specific one. This mapping/validation is provider concern and
 * stays here (or, if a provider ever needed its own non-ISO codes, in that
 * provider's adapter) — never in the admin UI.
 *
 * Every provider modelled today (Flutterwave) uses ISO-4217 alpha codes
 * verbatim in its API, so "normalization" is trim + uppercase. `supported`
 * is checked against the provider catalog's declared `supportedCurrencies`
 * (an empty list means the provider is not currency-restricted in our
 * catalog).
 */

export interface ProviderCurrency {
  /** ISO-4217 alpha code as stored on the country. */
  iso: string
  /** The exact currency token to send to this provider's API. */
  providerRepresentation: string
  /** Whether this provider's catalog entry lists the currency (empty list = unrestricted). */
  supported: boolean
}

export function resolveProviderCurrency(
  isoCode: string,
  provider: { code: string; supportedCurrencies: string[] },
): ProviderCurrency {
  const iso = isoCode.trim().toUpperCase()
  // Pass-through for every provider we model. A provider using its own
  // currency codes would override this via its adapter — the seam is here
  // so that stays a one-file change, not an admin-UI concern.
  const providerRepresentation = iso
  const supported =
    provider.supportedCurrencies.length === 0 || provider.supportedCurrencies.includes(iso)
  return { iso, providerRepresentation, supported }
}
