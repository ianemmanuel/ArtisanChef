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
    ],
    methodTypes: ["CARD", "MOBILE_MONEY", "BANK"],
    supportedCurrencies: ["KES", "UGX", "TZS", "RWF", "NGN", "GHS", "XOF", "XAF", "ZAR", "USD"],
    description: "Pan-African payment provider — card, mobile money and bank rails for both collection and payout. No adapter implemented yet.",
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
