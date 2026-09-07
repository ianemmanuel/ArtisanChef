/*
 * Pluggable payout-account verification. Vendor 1D wires in a Finance-backed
 * implementation (finance-bank.provider.ts) for BANK accounts, via the
 * existing Finance provider gateway / BankAccountResolutionCapability — see
 * that file's own doc comment for the ownership boundary. Every other
 * method type (and any country without a configured verification capability)
 * still falls back to the offline structural checks + manual admin review
 * this module shipped with originally.
 */

export type PayoutVerificationStatus = "PENDING" | "VERIFIED" | "FAILED" | "REQUIRES_REVIEW"

export type PayoutMethodType = "MOBILE_MONEY" | "BANK" | "DIGITAL_WALLET" | "CARD"

/*
 * A SAFE, stable, internal code for *why* verification didn't reach VERIFIED.
 * Never a raw provider string, never leaks account data. Stored on
 * VendorPayoutAccount.verificationFailureCode and shown (as a friendly
 * label) on the ERP review surface; the vendor only ever sees a generic
 * message. `null` = VERIFIED, or a plain PENDING that just needs a look.
 */
export type PayoutVerificationFailureCode =
  | "PROVIDER_UNSUPPORTED"    // the country's provider can't verify this currency at all — manual review
  | "PROVIDER_UNAVAILABLE"    // transport / auth / 5xx / timeout — our side, transient
  | "PROVIDER_REJECTED"       // the provider looked and would not confirm the account
  | "INVALID_ACCOUNT"         // structurally / provider-field invalid — the vendor can fix and retry
  | "NAME_MISMATCH"           // account-holder name doesn't match the vendor's legal identity
  | "DUPLICATE_ACCOUNT"       // identifier already used by another vendor in this country
  | "ADD_VELOCITY"            // too many payout accounts added in a short window
  | "MANUAL_REJECTION"        // an admin rejected it with a reason

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
  /** The vendor's registered country — required for a provider-backed
   *  capability lookup. Absent (or no matching capability) => the offline
   *  fallback applies, same as before this field existed. */
  countryId?: string | null
  /** ISO 4217 alpha code for the vendor's country — required by the bank
   *  resolution request shape. */
  currency? : string | null
}

export interface PayoutVerificationOutcome {
  status : PayoutVerificationStatus
  method : string            // "FORMAT_CHECKS" | "MANUAL" | provider name
  ref?   : string | null     // external reference, when a provider gives one
  reason?: string | null     // failure / review reason, human-readable (safe)
  /** Safe internal code for the ERP — see PayoutVerificationFailureCode. */
  failureCode?: PayoutVerificationFailureCode | null
  /** Structural problems found — each becomes a 400 field error at creation. */
  fieldErrors?: string[]
  /** Anything worth keeping for audit (stored on verificationMeta). */
  meta?  : Record<string, unknown>
}

export interface PayoutVerificationProvider {
  readonly name: string
  verify(input: PayoutVerificationInput): Promise<PayoutVerificationOutcome>
}
