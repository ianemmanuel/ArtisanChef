/*
 * Pure — the encryption/masking boundary for VendorPayoutAccount responses.
 * Split out of vendor.payout.service.ts (Vendor 1D) so it's unit-testable
 * without a database, same rationale as vendor.payoutRisk.ts and
 * vendor.outletClearance.ts before it.
 *
 * presentPayoutAccount() is the ONLY exit to any client, vendor or admin —
 * see its own doc comment. Nothing here talks to Prisma or a provider.
 */

// The banking identifiers stored as ciphertext. paypalEmail / stripeAccountId
// are contact identifiers, not bank credentials — left in the clear.
export type SensitiveField = "bankCode" | "branchCode" | "accountNumber" | "swiftCode" | "iban" | "routingNumber" | "mobileNumber"
export const SENSITIVE_FIELDS: SensitiveField[] = ["bankCode", "branchCode", "accountNumber", "swiftCode", "iban", "routingNumber", "mobileNumber"]

export interface PayoutMaskedDetails {
  bankCode?     : string
  branchCode?   : string
  accountNumber?: string
  swiftCode?    : string
  iban?         : string
  routingNumber?: string
  mobileNumber? : string
}

/** Row shape returned to clients — ciphertext fields dropped, `masked` added.
 *  Used by both the vendor payout endpoints and admin.vendor.service.ts's
 *  getVendorAccount, so payout accounts go through exactly one encryption
 *  boundary regardless of caller.
 *
 *  `includeRiskSignals` is admin-only: riskFlags / nameMatchScore /
 *  verificationMeta are internal review signals (DUPLICATE_IDENTIFIER in
 *  particular would confirm another vendor's account number to this one) —
 *  the vendor-facing endpoints strip them. */
export function presentPayoutAccount(account: object, opts: { includeRiskSignals?: boolean } = {}): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(account as Record<string, unknown>) }
  for (const f of SENSITIVE_FIELDS) delete out[f]
  const rawMask = out.maskedDetails
  out.masked = rawMask && typeof rawMask === "object" ? (rawMask as PayoutMaskedDetails) : null
  delete out.maskedDetails
  delete out.accountNumberHash
  delete out.mobileNumberHash
  if (!opts.includeRiskSignals) {
    delete out.riskFlags
    delete out.nameMatchScore
    delete out.verificationMeta
  }
  return out
}
