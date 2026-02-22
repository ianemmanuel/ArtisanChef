import { z } from "zod"

//* Business Details Form Schema
export const businessDetailsSchema = z.object({
  countryId: z.string().min(1, "Country is required"),
  vendorTypeId: z.string().min(1, "Vendor type is required"),
  otherVendorType: z.string().optional(),
  legalBusinessName: z
    .string()
    .min(2, "Legal business name must be at least 2 characters")
    .max(200, "Legal business name must not exceed 200 characters"),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  businessEmail: z.string().email("Invalid email address"),
  businessPhone: z.string().optional(),
  ownerFirstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(100, "First name must not exceed 100 characters"),
  ownerLastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(100, "Last name must not exceed 100 characters"),
  ownerPhone: z.string().optional(),
  ownerEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  businessAddress: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .max(300, "Address must not exceed 300 characters"),
  addressLine2: z.string().max(300, "Address line 2 must not exceed 300 characters").optional(),
  postalCode: z.string().optional(),
})


export type BusinessDetailsFormData = z.infer<typeof businessDetailsSchema>

// Document Upload Schema (for individual document)
export const documentUploadSchema = z.object({
  documentTypeId: z.string().min(1, "Document type is required"),
  file: z.instanceof(File).optional(),
  documentNumber: z.string().optional(),
  issueDate: z.date().optional(),
  expiryDate: z.date().optional(),
})

export type DocumentUploadFormData = z.infer<typeof documentUploadSchema>