"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { businessFormSchema, type BusinessFormInput } from "@/lib/validations/onboarding"
import { useUpdateApplication } from "@/lib/queries/onboarding"
import { ClientApiError } from "@/lib/api/client"
import { DocumentsSection } from "@/components/onboarding/documents/DocumentsSection"
import { ChangeScopeDialog } from "./ChangeScopeDialog"
import type { VendorApplicationDetail } from "@repo/types/vendor-app"

function toFieldValue(value: string | null): string {
  return value ?? ""
}

interface FormSection {
  title: string
  description: string
  fields: Array<{
    name: keyof BusinessFormInput
    label: string
    type?: string
    span?: "full" | "half"
    required?: boolean
  }>
}

// businessFormSchema is the source of truth for what's required — this
// list only drives the "(optional)" label, kept alongside so a schema
// change is visible here too, not silently out of sync.
const OPTIONAL_FIELDS = new Set<keyof BusinessFormInput>([
  "ownerPhone",
  "ownerEmail",
  "addressLine2",
  "postalCode",
])

const RAW_SECTIONS: FormSection[] = [
  {
    title: "Business information",
    description: "Your registered business identity.",
    fields: [
      { name: "legalBusinessName", label: "Legal business name", span: "full" },
      { name: "registrationNumber", label: "Registration number" },
      { name: "taxId", label: "Tax ID" },
    ],
  },
  {
    title: "Contact information",
    description: "How customers and DailyBread can reach the business.",
    fields: [
      { name: "businessEmail", label: "Business email", type: "email" },
      { name: "businessPhone", label: "Business phone", type: "tel" },
    ],
  },
  {
    title: "Owner information",
    description: "The primary owner or operator responsible for this account.",
    fields: [
      { name: "ownerFirstName", label: "First name" },
      { name: "ownerLastName", label: "Last name" },
      { name: "ownerPhone", label: "Owner phone", type: "tel" },
      { name: "ownerEmail", label: "Owner email", type: "email" },
    ],
  },
  {
    title: "Business address",
    description: "Where the business is legally located.",
    fields: [
      { name: "businessAddress", label: "Street address", span: "full" },
      { name: "addressLine2", label: "Address line 2", span: "full" },
      { name: "postalCode", label: "Postal code" },
    ],
  },
]

const SECTIONS: FormSection[] = RAW_SECTIONS.map((section) => ({
  ...section,
  fields: section.fields.map((field) => ({ ...field, required: !OPTIONAL_FIELDS.has(field.name) })),
}))

export function BusinessForm({ application }: { application: VendorApplicationDetail }) {
  const router = useRouter()
  const updateApplication = useUpdateApplication()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BusinessFormInput>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: {
      legalBusinessName: toFieldValue(application.legalBusinessName),
      registrationNumber: toFieldValue(application.registrationNumber),
      taxId: toFieldValue(application.taxId),
      businessEmail: toFieldValue(application.businessEmail),
      businessPhone: toFieldValue(application.businessPhone),
      ownerFirstName: toFieldValue(application.ownerFirstName),
      ownerLastName: toFieldValue(application.ownerLastName),
      ownerPhone: toFieldValue(application.ownerPhone),
      ownerEmail: toFieldValue(application.ownerEmail),
      businessAddress: toFieldValue(application.businessAddress),
      addressLine2: toFieldValue(application.addressLine2),
      postalCode: toFieldValue(application.postalCode),
    },
  })

  const FIELD_NAMES = new Set(SECTIONS.flatMap((s) => s.fields.map((f) => f.name)))

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateApplication.mutateAsync(values)
      router.push("/onboarding/review")
    } catch (err) {
      if (err instanceof ClientApiError && err.errors?.length) {
        let matched = 0
        for (const { field, message } of err.errors) {
          if (field && FIELD_NAMES.has(field as keyof BusinessFormInput)) {
            setError(field as keyof BusinessFormInput, { type: "server", message })
            matched++
          }
        }
        toast.error(
          matched
            ? "Please fix the highlighted field" + (matched === 1 ? "" : "s") + " below."
            : err.message,
        )
        return
      }

      toast.error(err instanceof ClientApiError ? err.message : "Couldn't save your application. Try again.")
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
              {section.fields.map((field) => (
                <div
                  key={field.name}
                  className={field.span === "full" ? "sm:col-span-2 space-y-2" : "space-y-2"}
                >
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required ? (
                      <span className="text-destructive" aria-hidden="true"> *</span>
                    ) : (
                      <span className="text-muted-foreground font-normal"> (optional)</span>
                    )}
                  </Label>
                  <Input id={field.name} type={field.type ?? "text"} {...register(field.name)} />
                  {errors[field.name] && (
                    <p className="text-sm text-destructive">{errors[field.name]?.message}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Required documents</CardTitle>
          <CardDescription>Uploaded documents are saved immediately — no need to wait until submission.</CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentsSection />
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
        <ChangeScopeDialog application={application} />
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save and continue"}
          </Button>
        </div>
      </div>
    </form>
  )
}
