import { z } from "zod"

// code is only ever set at creation — the backend's update body doesn't
// accept it at all (see DocumentType service), so it's not part of the
// edit schema below.
export const documentTypeCreateSchema = z.object({
  name             : z.string().min(2, "Name must be at least 2 characters").max(120, "Name is too long"),
  code             : z.string()
    .min(2, "Code must be at least 2 characters")
    .max(60, "Code is too long")
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, underscores or hyphens only"),
  description      : z.string().max(500, "Description is too long"),
  scope            : z.enum(["VENDOR", "OUTLET"]),
  isRequired       : z.boolean(),
  requiresExpiry   : z.boolean(),
  expiryWarningDays: z.number().int().min(0, "Must be 0 or more").max(365, "Must be 365 or fewer"),
  instructions     : z.string().max(1000, "Instructions are too long"),
  sampleUrl        : z.union([z.literal(""), z.string().url("Must be a valid URL")]),
})

export type DocumentTypeCreateFormValues = z.output<typeof documentTypeCreateSchema>

export const documentTypeUpdateSchema = documentTypeCreateSchema.omit({ code: true, scope: true })

export type DocumentTypeUpdateFormValues = z.output<typeof documentTypeUpdateSchema>
