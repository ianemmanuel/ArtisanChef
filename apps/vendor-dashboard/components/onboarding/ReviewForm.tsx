"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { Button } from "@repo/ui/components/button"
import { Badge } from "@repo/ui/components/badge"
import { Alert, AlertDescription } from "@repo/ui/components/alert"
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  AlertCircle,
  Eye,
  Pencil,
} from "lucide-react"
import { submitApplication, getDocumentViewUrl } from "@/lib/api"
import type { ApplicationPreview, VendorDocument } from "@/lib/api"

interface Props {
  preview: ApplicationPreview
}

export function ReviewForm({ preview }: Props) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const { application, requirements } = preview

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const token = await getToken()
      if (!token) { setError("Authentication error. Please refresh."); return }

      const { data, error } = await submitApplication(token, application.id)
      if (error || !data) { setError(error ?? "Submission failed. Please try again."); return }

      router.push("/onboarding")
      router.refresh()
    })
  }

  async function handlePreview(doc: VendorDocument) {
    const token = await getToken()
    if (!token) return
    const { data } = await getDocumentViewUrl(token, doc.id)
    if (data?.url) window.open(data.url, "_blank")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm px-8 py-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <h1 className="text-xl font-semibold text-stone-900">Review your application</h1>
        </div>
        <p className="text-sm text-stone-500 ml-11">
          Check everything before you submit. You can go back and make changes at any time.
        </p>
      </div>

      {/* Business details */}
      <ReviewSection
        title="Business details"
        onEdit={() => router.push("/onboarding/business-details")}
      >
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <ReviewRow label="Legal business name" value={application.legalBusinessName} span />
          <ReviewRow label="Country" value={application.country?.name ?? application.countryId} />
          <ReviewRow label="Vendor type" value={application.vendorType?.name ?? application.vendorTypeId} />
          {application.registrationNumber && (
            <ReviewRow label="Registration number" value={application.registrationNumber} />
          )}
          {application.taxId && (
            <ReviewRow label="Tax ID" value={application.taxId} />
          )}
          <ReviewRow label="Business email" value={application.businessEmail} />
          {application.businessPhone && (
            <ReviewRow label="Business phone" value={application.businessPhone} />
          )}
          <ReviewRow
            label="Owner"
            value={`${application.ownerFirstName} ${application.ownerLastName}`}
          />
          {application.ownerEmail && (
            <ReviewRow label="Owner email" value={application.ownerEmail} />
          )}
          {application.ownerPhone && (
            <ReviewRow label="Owner phone" value={application.ownerPhone} />
          )}
          <ReviewRow label="Business address" value={application.businessAddress} span />
          {application.addressLine2 && (
            <ReviewRow label="Address line 2" value={application.addressLine2} />
          )}
          {application.postalCode && (
            <ReviewRow label="Postal code" value={application.postalCode} />
          )}
        </div>
      </ReviewSection>

      {/* Documents */}
      <ReviewSection
        title="Documents"
        onEdit={() => router.push("/onboarding/documents")}
      >
        <div className="space-y-2">
          {requirements.map((req) => (
            <div
              key={req.documentTypeId}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-stone-50"
            >
              <div
                className={
                  req.uploaded
                    ? "h-7 w-7 rounded-full bg-emerald-50 flex items-center justify-center shrink-0"
                    : "h-7 w-7 rounded-full bg-stone-100 flex items-center justify-center shrink-0"
                }
              >
                {req.uploaded ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-stone-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-800">{req.name}</span>
                  <Badge
                    variant="outline"
                    className={
                      req.isRequired
                        ? "text-[10px] border-orange-200 text-orange-600 bg-orange-50 shrink-0"
                        : "text-[10px] border-stone-200 text-stone-400 shrink-0"
                    }
                  >
                    {req.isRequired ? "Required" : "Optional"}
                  </Badge>
                </div>
                {req.uploadedDocument?.documentName && (
                  <p className="text-xs text-stone-400 truncate mt-0.5">
                    {req.uploadedDocument.documentName}
                  </p>
                )}
              </div>

              {req.uploadedDocument && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePreview(req.uploadedDocument!)}
                  className="h-7 w-7 p-0 text-stone-400 hover:text-stone-700 shrink-0"
                  title="Preview"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </ReviewSection>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submit notice */}
      <div className="rounded-xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        <p className="font-medium mb-0.5">Before you submit</p>
        <p className="text-amber-700 text-xs leading-relaxed">
          Once submitted, your application will be locked for review. You won't be able to edit it
          until our team responds. Make sure all information is accurate.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          onClick={() => router.push("/onboarding/documents")}
          className="gap-2 text-stone-600 hover:text-stone-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to documents
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={isPending}
          className="gap-2 px-6 bg-orange-500 hover:bg-orange-600 text-white"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            "Submit application"
          )}
        </Button>
      </div>
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
        <h2 className="text-sm font-semibold text-stone-800">{title}</h2>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-orange-600 transition-colors"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function ReviewRow({
  label,
  value,
  span,
}: {
  label: string
  value: string
  span?: boolean
}) {
  return (
    <div className={span ? "col-span-2" : ""}>
      <p className="text-xs text-stone-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-stone-800">{value}</p>
    </div>
  )
}