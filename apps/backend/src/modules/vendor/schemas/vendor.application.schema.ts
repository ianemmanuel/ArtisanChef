import { z } from "zod"

/*
 * Starting an application. This is deliberately tiny — just enough
 * to know which document/field requirements to show next. 
*/

export const createApplicationSchema = z.object({
    countryId: z.string().uuid(),
    vendorTypeId: z.string().uuid(),
    otherVendorType: z.string().trim().min(1).max(120).optional(),
})

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>

/*
 * The frontend's businessFormSchema renders ownerPhone/ownerEmail as
 * genuinely optional inputs, which — like any blank HTML input —
 * submit as "" rather than being omitted from the payload. "" must
 * therefore be treated the same as "not provided", not run through
 * the format validator (an empty string is neither a 5-char phone
 * number nor a valid email).
 */
const blankToUndefined = (val: unknown) => (val === "" ? undefined : val)

/*
 * Used by every subsequent form page to save its own slice of the
 * application. Every field is optional at this layer — a page only
 * sends what it owns — but each field is still format-validated
 * when present. `.strict()` so a typo'd key fails loudly instead of
 * silently doing nothing.
*/
export const updateApplicationSchema = z
  .object({
    legalBusinessName: z.string().trim().min(1).max(200).optional(),
    registrationNumber: z.string().trim().min(1).max(100).optional(),
    taxId: z.string().trim().min(1).max(100).optional(),
    businessEmail: z.string().trim().email().optional(),
    businessPhone: z.string().trim().min(5).max(30).optional(),
    ownerFirstName: z.string().trim().min(1).max(100).optional(),
    ownerLastName: z.string().trim().min(1).max(100).optional(),
    ownerPhone: z.preprocess(blankToUndefined, z.string().trim().min(5).max(30).optional()),
    ownerEmail: z.preprocess(blankToUndefined, z.string().trim().email().optional()),
    businessAddress: z.string().trim().min(1).max(300).optional(),
    addressLine2: z.string().trim().max(300).optional(),
    postalCode: z.string().trim().max(20).optional(),
  })
  .strict()

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>

/*
 * Country/vendor type changes go through their own endpoint since
 * they're destructive (they invalidate uploaded documents) — never
 * folded into updateApplicationSchema.
 */
export const changeApplicationScopeSchema = createApplicationSchema

/*
 * Completeness is a property of the persisted row at submit time,
 * not of any single request body — so this isn't a Zod schema, just
 * the list of columns that must be non-null before a vendor can hit
 * Submit. Keep this in sync with updateApplicationSchema's required
 * business fields.
 */
export const REQUIRED_APPLICATION_FIELDS = [
  "legalBusinessName",
  "registrationNumber",
  "businessEmail",
  "businessPhone",
  "taxId",
  "ownerFirstName",
  "ownerLastName",
  "businessAddress",
] as const