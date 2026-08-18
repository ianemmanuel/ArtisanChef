import { z } from "zod"

/*
 * Mirrors the backend's Zod schemas exactly (createApplicationSchema /
 * updateApplicationSchema / REQUIRED_APPLICATION_FIELDS in
 * apps/backend/src/modules/vendor/schemas/vendor.application.schema.ts).
 * Frontend validation here is UX only — the backend re-validates and
 * remains the authorization/correctness boundary.
 */

//* Step 1 — country + vendor type. Same shape backs both the initial
//* create and the destructive change-scope flow.
export const getStartedSchema = z.object({
  countryId: z.string().uuid("Select a country"),
  vendorTypeId: z.string().uuid("Select a vendor type"),
  otherVendorType: z.string().trim().min(1).max(120).optional(),
})

export type GetStartedInput = z.infer<typeof getStartedSchema>

/*
 * The business application form. Fields the backend requires before
 * SUBMIT (REQUIRED_APPLICATION_FIELDS) are required here too — this is
 * one page meant to be completed in full before moving to Review, not
 * a progressive per-field save. ownerPhone/ownerEmail/addressLine2/
 * postalCode stay genuinely optional, matching the backend.
 */
export const businessFormSchema = z.object({
  legalBusinessName: z.string().trim().min(1, "Required").max(200),
  registrationNumber: z.string().trim().min(1, "Required").max(100),
  taxId: z.string().trim().min(1, "Required").max(100),
  businessEmail: z.string().trim().min(1, "Required").email("Enter a valid email"),
  businessPhone: z.string().trim().min(5, "Required").max(30),
  ownerFirstName: z.string().trim().min(1, "Required").max(100),
  ownerLastName: z.string().trim().min(1, "Required").max(100),
  ownerPhone: z.string().trim().max(30).optional().or(z.literal("")),
  ownerEmail: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  businessAddress: z.string().trim().min(1, "Required").max(300),
  addressLine2: z.string().trim().max(300).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
})

export type BusinessFormInput = z.infer<typeof businessFormSchema>
