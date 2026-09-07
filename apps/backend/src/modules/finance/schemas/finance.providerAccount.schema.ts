import { z } from "zod"
import { BUSINESS_CAPABILITIES } from "../providers/provider.capabilities"

// The admin only ever selects BUSINESS capabilities. Integration
// capabilities (webhooks, bank directory, account verification) are merged
// in by the service from the provider's adapter — never a request field.
const businessCapability = z.enum(BUSINESS_CAPABILITIES)
const environment = z.enum(["TEST", "LIVE"])

export const createCountryProviderAccountSchema = z
  .object({
    paymentProviderId: z.string().uuid(),
    environment,
    // secretAlias is DERIVED (provider + country + environment) — see
    // deriveProviderSecretAlias. Never entered by an admin.
    enabledCapabilities: z.array(businessCapability).min(1),
    accountLabel: z.string().trim().max(120).optional(),
    externalAccountId: z.string().trim().max(200).optional(),
  })
  .strict()

export const updateCountryProviderAccountSchema = z
  .object({
    enabledCapabilities: z.array(businessCapability).min(1).optional(),
    accountLabel: z.string().trim().max(120).optional(),
    externalAccountId: z.string().trim().max(200).optional(),
    // Structural — the service requires GLOBAL scope. Changing it
    // re-derives the secret alias.
    environment: environment.optional(),
  })
  .strict()

export const suspendSchema = z.object({ reason: z.string().trim().min(3).max(500) }).strict()

export type CreateCountryProviderAccountInput = z.infer<typeof createCountryProviderAccountSchema>
export type UpdateCountryProviderAccountInput = z.infer<typeof updateCountryProviderAccountSchema>
export type SuspendInput = z.infer<typeof suspendSchema>
