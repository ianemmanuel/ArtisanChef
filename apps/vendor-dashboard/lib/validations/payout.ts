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

export function payoutSchemaFor(methodType: PayoutMethodType | undefined) {
  return base.superRefine((val, ctx) => {
    if (methodType === "MOBILE_MONEY" && !val.mobileNumber) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mobileNumber"], message: "Mobile number is required" })
    }
    if (methodType === "BANK") {
      if (!val.bankName) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bankName"], message: "Bank name is required" })
      if (!val.accountNumber) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accountNumber"], message: "Account number is required" })
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
