import { z } from "zod"

export const setConfigCurrencySchema = z
  .object({ currencyCode: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "3-letter ISO-4217 code") })
  .strict()

export const setActiveProviderAccountSchema = z
  .object({ activeProviderAccountId: z.string().uuid().nullable() })
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

export type SetConfigCurrencyInput = z.infer<typeof setConfigCurrencySchema>
export type SetActiveProviderAccountInput = z.infer<typeof setActiveProviderAccountSchema>
export type SetOperationalSwitchesInput = z.infer<typeof setOperationalSwitchesSchema>
