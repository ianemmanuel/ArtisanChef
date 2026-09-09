import { z } from "zod"

/*
 * Frontend validation for adding a payout account. Mirrors the per-method
 * minimum-field rules enforced by vendor.payout.service.addPayoutAccount —
 * this is UX only. The backend re-validates, runs structural checksums
 * (IBAN mod-97, ABA, MSISDN) and risk checks, and remains authoritative.
 *
 * There is deliberately no "edit" schema: the backend exposes no update
 * endpoint for a payout account (identifiers are encrypted at rest and
 * never returned) — changing details means removing and re-adding.
 */

export type PayoutMethodType = "MOBILE_MONEY" | "BANK" | "DIGITAL_WALLET" | "CARD"

const base = z.object({
  countryPaymentMethodId: z.string().min(1, "Choose a payout method"),
  accountHolderName     : z.string().trim().min(2, "Enter the name on the account"),
  mobileNetwork  : z.string().trim().optional(),
  mobileNumber   : z.string().trim().optional(),
  bankName       : z.string().trim().optional(),
  branchName     : z.string().trim().optional(),
  bankCode       : z.string().trim().optional(),
  accountNumber  : z.string().trim().optional(),
  swiftCode      : z.string().trim().optional(),
  iban           : z.string().trim().optional(),
  routingNumber  : z.string().trim().optional(),
  paypalEmail    : z.string().trim().optional(),
  stripeAccountId : z.string().trim().optional(),
})

export type PayoutFormValues = z.infer<typeof base>

/*
 * Which fields this method type actually requires — the ONE place the form
 * and the schema agree on it, so a field marked required in the UI is
 * exactly a field the schema rejects when empty (they used to be two
 * separate hand-maintained lists, which is how a required field can end up
 * looking optional).
 *
 * `proofDocument` is required only where the vendor's country verifies bank
 * accounts MANUALLY — see PayoutVerificationRequirement. Everything not
 * listed here is genuinely optional and is labelled so in the form.
 */
export function requiredPayoutFields(
  methodType: PayoutMethodType | undefined,
  requiresProof = false,
): ReadonlySet<string> {
  const req = new Set<string>(["countryPaymentMethodId", "accountHolderName"])
  if (methodType === "MOBILE_MONEY") {
    req.add("mobileNetwork")
    req.add("mobileNumber")
  }
  if (methodType === "BANK") {
    req.add("bankName")
    req.add("accountNumber")
    if (requiresProof) req.add("proofDocument")
  }
  if (methodType === "DIGITAL_WALLET") req.add("paypalEmail")
  return req
}

export interface PayoutSchemaOptions {
  /** MANUAL-verification country: proof of bank-account ownership is required. */
  requiresProof?: boolean
  /** True once a proof file has finished uploading. */
  hasProof?: boolean
}

export function payoutSchemaFor(
  methodType: PayoutMethodType | undefined,
  opts: PayoutSchemaOptions = {},
) {
  return base.superRefine((val, ctx) => {
    if (methodType === "MOBILE_MONEY") {
      if (!val.mobileNetwork) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mobileNetwork"], message: "Mobile network is required" })
      }
      if (!val.mobileNumber) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mobileNumber"], message: "Mobile number is required" })
      }
    }
    if (methodType === "BANK") {
      if (!val.bankName) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bankName"], message: "Select or enter your bank" })
      if (!val.accountNumber) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accountNumber"], message: "Account number is required" })
      // The backend enforces this too (PROOF_DOCUMENT_REQUIRED) and stays
      // authoritative — this only stops a pointless round trip.
      if (opts.requiresProof && !opts.hasProof) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["proofDocument"],
          message: "Upload proof of bank-account ownership to continue",
        })
      }
    }
    if (methodType === "DIGITAL_WALLET" && !val.paypalEmail && !val.stripeAccountId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["paypalEmail"], message: "Enter a PayPal email or Stripe account ID" })
    }
    if (val.paypalEmail && !z.string().email().safeParse(val.paypalEmail).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["paypalEmail"], message: "Enter a valid email address" })
    }
  })
}

export const EMPTY_PAYOUT_FORM: PayoutFormValues = {
  countryPaymentMethodId: "",
  accountHolderName     : "",
  mobileNetwork: "", mobileNumber: "",
  bankName: "", branchName: "", bankCode: "", accountNumber: "", swiftCode: "", iban: "", routingNumber: "",
  paypalEmail: "", stripeAccountId: "",
}
