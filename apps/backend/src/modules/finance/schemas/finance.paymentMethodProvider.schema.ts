import { z } from "zod"

/** Link (or unlink, when null) a CountryPaymentMethod to a CountryProviderAccount. */
export const setPaymentMethodProviderAccountSchema = z
  .object({ countryProviderAccountId: z.string().uuid().nullable() })
  .strict()

export type SetPaymentMethodProviderAccountInput = z.infer<typeof setPaymentMethodProviderAccountSchema>
