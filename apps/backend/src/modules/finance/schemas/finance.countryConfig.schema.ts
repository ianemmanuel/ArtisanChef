import { z } from "zod"

// Currency is not set here — it is derived from Country.currencyCode.

// The country-global bank-account verification/resolution routing binding.
// null clears it (the country stops offering automatic bank verification).
export const setBankVerificationProviderAccountSchema = z
  .object({ providerAccountId: z.string().uuid().nullable() })
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
export type SetOperationalSwitchesInput = z.infer<typeof setOperationalSwitchesSchema>
