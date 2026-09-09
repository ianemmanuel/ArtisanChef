import { z } from "zod"

// Currency is not set here — it is derived from Country.currencyCode.

// The country-global bank-account verification/resolution routing binding.
// null clears it (the country stops offering automatic bank verification).
export const setBankVerificationProviderAccountSchema = z
  .object({ providerAccountId: z.string().uuid().nullable() })
  .strict()

// How this country verifies vendor bank payout accounts. PROVIDER requires a
// bound bank-verification provider account; MANUAL uses a proof document +
// admin review (markets with no bank-resolution provider at all).
export const setBankVerificationModeSchema = z
  .object({ mode: z.enum(["PROVIDER", "MANUAL"]) })
  .strict()

export const setOperationalSwitchesSchema = z
  .object({
    collectionsEnabled: z.boolean().optional(),
    payoutsEnabled: z.boolean().optional(),
  })
  .strict()
  .refine((v) => v.collectionsEnabled !== undefined || v.payoutsEnabled !== undefined, {
    message: "Provide collectionsEnabled and/or payoutsEnabled",
  })

export type SetBankVerificationProviderAccountInput = z.infer<typeof setBankVerificationProviderAccountSchema>
export type SetBankVerificationModeInput = z.infer<typeof setBankVerificationModeSchema>
export type SetOperationalSwitchesInput = z.infer<typeof setOperationalSwitchesSchema>
