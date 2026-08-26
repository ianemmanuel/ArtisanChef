/**
 * Canonical payment-method catalog — global definitions, not tied to any
 * country. Mirrors the vendor-types seed convention: the catalog entry
 * itself (what a method IS, and which directions it's capable of) is
 * seeded; whether it's actually offered in a given country (INBOUND for
 * customer payments, OUTBOUND for vendor payouts, with our own
 * collection/disbursement account details) is a live business decision
 * per market, left to the admin CountryPaymentMethod endpoints — see
 * seed/finance/index.ts.
 */
import type { PaymentMethodType, PaymentDirection } from "@repo/db"

export interface PaymentMethodSeedRow {
  code       : string
  name       : string
  type       : PaymentMethodType
  direction  : PaymentDirection[]
  description: string
}

export const PAYMENT_METHODS: PaymentMethodSeedRow[] = [
  {
    code: "MPESA", name: "M-Pesa", type: "MOBILE_MONEY", direction: ["INBOUND", "OUTBOUND"],
    description: "Safaricom mobile money — customer payments and vendor payouts across East Africa",
  },
  {
    code: "AIRTEL_MONEY", name: "Airtel Money", type: "MOBILE_MONEY", direction: ["INBOUND", "OUTBOUND"],
    description: "Airtel mobile money — customer payments and vendor payouts",
  },
  {
    code: "BANK_TRANSFER", name: "Bank Transfer", type: "BANK", direction: ["INBOUND", "OUTBOUND"],
    description: "Direct bank transfer / EFT — customer payments and vendor payouts",
  },
  {
    code: "CARD", name: "Card (Visa/Mastercard)", type: "CARD", direction: ["INBOUND"],
    description: "Customer card payments via a card processor — not used for vendor payout",
  },
  {
    code: "STRIPE", name: "Stripe", type: "DIGITAL_WALLET", direction: ["INBOUND", "OUTBOUND"],
    description: "Stripe — customer payment collection and Stripe Connect vendor payouts",
  },
  {
    code: "PAYPAL", name: "PayPal", type: "DIGITAL_WALLET", direction: ["INBOUND", "OUTBOUND"],
    description: "PayPal — customer payments and vendor payouts",
  },
]
