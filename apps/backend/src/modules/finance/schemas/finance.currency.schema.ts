import { z } from "zod"

/*
 * Currency reference validation. minorUnitDigits is constrained to the
 * values ISO-4217 actually uses (0/2/3/4) — see lib/currency.ts.
 */

const minorUnitDigits = z
  .number()
  .int()
  .refine((n) => [0, 2, 3, 4].includes(n), "minorUnitDigits must be one of 0, 2, 3, 4")

export const listCurrenciesQuerySchema = z
  .object({
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    search: z.string().trim().min(1).max(100).optional(),
  })
  .strict()

export const createCurrencySchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Must be a 3-letter ISO-4217 code"),
    name: z.string().trim().min(2).max(100),
    symbol: z.string().trim().min(1).max(8).optional(),
    minorUnitDigits: minorUnitDigits.optional(),
  })
  .strict()

export const updateCurrencySchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    symbol: z.string().trim().min(1).max(8).optional(),
    minorUnitDigits: minorUnitDigits.optional(),
  })
  .strict()

export type CreateCurrencyInput = z.infer<typeof createCurrencySchema>
export type UpdateCurrencyInput = z.infer<typeof updateCurrencySchema>
