/*
 * Pluggable payout-account verification. Today the only implementations are
 * offline (structural checksums + manual admin review). A real provider —
 * telco name-lookup (Daraja / Africa's Talking), open-banking account
 * verification (Plaid), Stripe Connect account links — drops in here as
 * another `PayoutVerificationProvider` with zero changes to the payout
 * service. See CLAUDE.md for the deferred-until-paid-API list.
 */

export type PayoutVerificationStatus = "PENDING" | "VERIFIED" | "FAILED" | "REQUIRES_REVIEW"

export type PayoutMethodType = "MOBILE_MONEY" | "BANK" | "DIGITAL_WALLET" | "CARD"

export interface PayoutVerificationInput {
  methodType       : PayoutMethodType
  accountHolderName?: string | null
  bankName?         : string | null
  bankCode?         : string | null
  accountNumber?    : string | null
  swiftCode?        : string | null
  iban?             : string | null
  routingNumber?    : string | null
  mobileNetwork?    : string | null
  mobileNumber?     : string | null
  paypalEmail?      : string | null
  stripeAccountId?  : string | null
}

export interface PayoutVerificationOutcome {
  status : PayoutVerificationStatus
  method : string            // "FORMAT_CHECKS" | "MANUAL" | provider name
  ref?   : string | null     // external reference, when a provider gives one
  reason?: string | null     // failure / review reason, human-readable
  /** Structural problems found — each becomes a 400 field error at creation. */
  fieldErrors?: string[]
  /** Anything worth keeping for audit (stored on verificationMeta). */
  meta?  : Record<string, unknown>
}

export interface PayoutVerificationProvider {
  readonly name: string
  verify(input: PayoutVerificationInput): Promise<PayoutVerificationOutcome>
}
