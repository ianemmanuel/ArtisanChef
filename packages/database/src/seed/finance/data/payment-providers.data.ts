/**
 * PaymentProvider CATALOG seed — the platform's declared knowledge of
 * which provider implementations exist and what each is expected to be
 * able to do.
 *
 * This is NOT an integration. No Flutterwave/Stripe adapter code exists
 * yet (see apps/backend/src/modules/finance/providers — contracts only).
 * A catalog row just lets an admin see the provider and, in a later
 * phase, wire it to a country. `capabilities` is what the future adapter
 * is expected to implement; a country may only enable an operation whose
 * provider declares the matching capability.
 *
 * `capabilities` / `methodTypes` MUST stay coherent — see
 * validateProviderCapabilityCoherence (finance module). The seed values
 * below are coherent by construction.
 */
export interface PaymentProviderSeedRow {
  code: string
  name: string
  capabilities: string[]
  methodTypes: string[]
  supportedCurrencies: string[]
  description: string
}

export const PAYMENT_PROVIDERS: PaymentProviderSeedRow[] = [
  {
    code: "FLUTTERWAVE",
    name: "Flutterwave",
    capabilities: [
      "COLLECTION_CARD",
      "COLLECTION_MOBILE_MONEY",
      "COLLECTION_BANK_TRANSFER",
      "REFUND",
      "BANK_ACCOUNT_RESOLUTION",
      "PAYOUT_BANK",
      "PAYOUT_MOBILE_MONEY",
      "WEBHOOKS",
      // Integration capability — the adapter implements GET /banks?country=
      // (flutterwave.adapter.ts). Must be declared here or the country
      // provider account never gets it merged in, the ERP "Test provider"
      // control hides itself, and vendor bank discovery (Vendor 1E) fails
      // with PROVIDER_CAPABILITY_NOT_ENABLED.
      "BANK_LIST",
    ],
    methodTypes: ["CARD", "MOBILE_MONEY", "BANK"],
    supportedCurrencies: ["KES", "UGX", "TZS", "RWF", "NGN", "GHS", "XOF", "XAF", "ZAR", "USD"],
    description: "Pan-African payment provider — card, mobile money and bank rails for both collection and payout, plus bank-directory and account-verification integration.",
  },
  {
    code: "DLOCAL",
    name: "dLocal",
    // Bank-account resolution ONLY for now — dLocal's account-validation
    // endpoint (docs.dlocal.com/reference/account-validation). Its
    // collection/payout rails are separate APIs and separate future phases;
    // the adapter (finance/providers/dlocal) deliberately does not implement
    // them, so they are not declared here — capability support stays honest.
    // BANK_ACCOUNT_RESOLUTION is an integration capability: auto-merged onto
    // any dLocal CountryProviderAccount, never an admin checkbox.
    capabilities: ["BANK_ACCOUNT_RESOLUTION"],
    // No business method types yet (no collection/payout). Not currency-
    // restricted in our catalog — dLocal's validation is country-keyed, and
    // the adapter enforces the exact supported-country set itself
    // (DLOCAL_ACCOUNT_VALIDATION); Nigeria is the first operational market.
    methodTypes: [],
    supportedCurrencies: [],
    description:
      "Emerging-markets payment provider. Wired for bank-account verification (account validation) — Nigeria live, other dLocal-documented countries a one-line adapter addition. Collection/payout rails deferred to their own phase.",
  },
  {
    code: "STRIPE",
    name: "Stripe",
    capabilities: ["COLLECTION_CARD", "REFUND", "PAYOUT_BANK", "WEBHOOKS"],
    methodTypes: ["CARD", "BANK"],
    supportedCurrencies: ["USD", "EUR", "GBP"],
    description: "Card collection + Stripe Connect bank payouts. Reserved for future non-African markets. No adapter implemented yet.",
  },
]
