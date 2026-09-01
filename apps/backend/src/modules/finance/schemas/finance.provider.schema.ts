import { z } from "zod"
import { PROVIDER_CAPABILITIES, PAYMENT_METHOD_TYPES } from "../providers/provider.capabilities"

/*
 * PaymentProvider catalog validation. Structural only — capability
 * COHERENCE (e.g. "declares CARD method type but no card capability") is
 * checked in finance.provider.service.ts via
 * validateProviderCapabilityCoherence, so the rule has one home and can
 * be unit-tested without Zod.
 */

const capability = z.enum(PROVIDER_CAPABILITIES)
const methodType = z.enum(PAYMENT_METHOD_TYPES)
const currencyCode = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Must be a 3-letter ISO-4217 code")

export const listPaymentProvidersQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(100).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict()

export const createPaymentProviderSchema = z
  .object({
    code: z.string().trim().min(2).max(40),
    name: z.string().trim().min(2).max(120),
    capabilities: z.array(capability).min(1),
    methodTypes: z.array(methodType).max(4).optional(),
    supportedCurrencies: z.array(currencyCode).max(200).optional(),
    description: z.string().trim().max(500).optional(),
  })
  .strict()

export const updatePaymentProviderSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    capabilities: z.array(capability).min(1).optional(),
    methodTypes: z.array(methodType).max(4).optional(),
    supportedCurrencies: z.array(currencyCode).max(200).optional(),
    description: z.string().trim().max(500).optional(),
  })
  .strict()

export const setFinanceReferenceStatusSchema = z
  .object({ status: z.enum(["ACTIVE", "INACTIVE"]) })
  .strict()

export type ListPaymentProvidersQuery = z.infer<typeof listPaymentProvidersQuerySchema>
export type CreatePaymentProviderInput = z.infer<typeof createPaymentProviderSchema>
export type UpdatePaymentProviderInput = z.infer<typeof updatePaymentProviderSchema>
export type SetFinanceReferenceStatusInput = z.infer<typeof setFinanceReferenceStatusSchema>
