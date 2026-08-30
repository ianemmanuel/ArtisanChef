import type { PayoutVerificationProvider, PayoutVerificationInput, PayoutVerificationOutcome } from "./types"
import { isValidIban, isValidAbaRouting, isValidSwift, isPlausibleMsisdn } from "./checksums"

/*
 * The default provider while there's no paid verification API wired up.
 * It can only do two things:
 *   • FAIL fast on a structurally broken identifier (bad IBAN checksum, a
 *     "phone number" that's 4 digits) — these come back as fieldErrors and
 *     the payout service turns them into a 400.
 *   • Otherwise return PENDING — structurally fine, but nothing here proves
 *     the account is real or the vendor's, so it sits in the manual-verify
 *     queue for an admin.
 * It never returns VERIFIED. Only a real provider or an admin can do that.
 */
export const formatChecksProvider: PayoutVerificationProvider = {
  name: "FORMAT_CHECKS",

  async verify(input: PayoutVerificationInput): Promise<PayoutVerificationOutcome> {
    const fieldErrors: string[] = []

    if (input.iban && input.iban.trim() && !isValidIban(input.iban)) {
      fieldErrors.push("iban: failed the IBAN checksum — check for a typo")
    }
    if (input.routingNumber && input.routingNumber.trim() && !isValidAbaRouting(input.routingNumber)) {
      fieldErrors.push("routingNumber: not a valid 9-digit ABA routing number")
    }
    if (input.swiftCode && input.swiftCode.trim() && !isValidSwift(input.swiftCode)) {
      fieldErrors.push("swiftCode: not a valid 8 or 11 character SWIFT/BIC")
    }
    if (input.methodType === "MOBILE_MONEY" && input.mobileNumber && !isPlausibleMsisdn(input.mobileNumber)) {
      fieldErrors.push("mobileNumber: doesn't look like a valid phone number")
    }
    if (input.methodType === "BANK" && input.accountNumber && input.accountNumber.replace(/\s+/g, "").length < 4) {
      fieldErrors.push("accountNumber: too short to be a real account number")
    }

    if (fieldErrors.length > 0) {
      return {
        status: "FAILED",
        method: "FORMAT_CHECKS",
        reason: "One or more account identifiers are structurally invalid.",
        fieldErrors,
        meta  : { checkedAt: new Date().toISOString() },
      }
    }

    return {
      status: "PENDING",
      method: "FORMAT_CHECKS",
      reason: "Structural checks passed. Manual verification still required — no automated bank/mobile verification is configured.",
      meta  : { checkedAt: new Date().toISOString() },
    }
  },
}
