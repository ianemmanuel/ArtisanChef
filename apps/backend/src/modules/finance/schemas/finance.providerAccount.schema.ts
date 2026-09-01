import { z } from "zod"
import { PROVIDER_CAPABILITIES } from "../providers/provider.capabilities"

const capability = z.enum(PROVIDER_CAPABILITIES)
const environment = z.enum(["TEST", "LIVE"])

export const createCountryProviderAccountSchema = z
  .object({
    paymentProviderId: z.string().uuid(),
    environment,
    secretAlias: z.string().trim().min(2).max(120).regex(/^[a-z0-9_]+$/i, "letters, digits and underscores only"),
    enabledCapabilities: z.array(capability).min(1),
    accountLabel: z.string().trim().max(120).optional(),
    externalAccountId: z.string().trim().max(200).optional(),
  })
  .strict()

export const updateCountryProviderAccountSchema = z
  .object({
    enabledCapabilities: z.array(capability).min(1).optional(),
    accountLabel: z.string().trim().max(120).optional(),
    externalAccountId: z.string().trim().max(200).optional(),
    // Structural — the service requires GLOBAL scope for these.
    secretAlias: z.string().trim().min(2).max(120).regex(/^[a-z0-9_]+$/i).optional(),
    environment: environment.optional(),
  })
  .strict()

export const suspendSchema = z.object({ reason: z.string().trim().min(3).max(500) }).strict()

export type CreateCountryProviderAccountInput = z.infer<typeof createCountryProviderAccountSchema>
export type UpdateCountryProviderAccountInput = z.infer<typeof updateCountryProviderAccountSchema>
export type SuspendInput = z.infer<typeof suspendSchema>
