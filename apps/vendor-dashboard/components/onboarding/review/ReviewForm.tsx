"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, ArrowRight, CheckCircle2, Clock, FileText,
  Building2, User, MapPin, Mail, Loader2, AlertTriangle, Info
} from "lucide-react"
import { Button } from "@repo/ui/components/button"
import { Alert, AlertDescription } from "@repo/ui/components/alert"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentType {
  id: string
  name: string
  code: string
}

interface UploadedDocument {
  id: string
  documentName: string | null
  mimeType: string | null
  status: string
  documentType: DocumentType
}

interface Requirement {
  documentTypeId: string
  name: string
  isRequired: boolean
  uploaded: boolean
  uploadedDocument: UploadedDocument | null
}

interface Progress {
  requiredTotal: number
  uploadedRequired: number
  percentage: number
  isComplete: boolean
}

interface Application {
  id: string
  status: string
  legalBusinessName: string
  registrationNumber: string | null
  taxId: string | null
  businessEmail: string
  businessPhone: string | null
  ownerFirstName: string
  ownerLastName: string
  ownerEmail: string | null
  ownerPhone: string | null
  businessAddress: string
  addressLine2: string | null
  postalCode: string | null
  country: { name: string }
  vendorType: { name: string }
  otherVendorType: string | null
}

interface Props {
  application: Application
  requirements: Requirement[]
  progress: Progress
  canSubmit: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DocStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING:  { label: "Pending Review", className: "bg-amber-100 text-amber-700" },
    APPROVED: { label: "Approved",       className: "bg-green-100 text-green-700" },
    REJECTED: { label: "Rejected",       className: "bg-red-100 text-red-700" },
  }
  const config = map[status] ?? { label: status, className: "bg-stone-100 text-stone-600" }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.className}`}>
      {config.label}
    </span>
  )
}

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-stone-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-stone-800">{value || "—"}</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReviewForm({ application, requirements, progress, canSubmit }: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const safeRequirements = requirements ?? []
  const uploadedDocs = safeRequirements.filter(r => r.uploaded && r.uploadedDocument)
  const missingRequired = safeRequirements.filter(r => r.isRequired && !r.uploaded)

  async function handleSubmit() {
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/onboarding/submit/${application.id}`, {
        method: "POST",
      })

      const data = await res.json()

      if (!res.ok || data.status !== "success") {
        const message = res.status < 500
          ? data?.message || "Failed to submit application"
          : "Something went wrong. Please try again."
        console.error("[ReviewForm] submit error:", data)
        setError(message)
        return
      }

      toast.success("Application submitted!")
      router.push("/onboarding")
    } catch (err) {
      console.error("[ReviewForm] unexpected submit error:", err)
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Header with submission note */}
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Review Your Application</h1>
        <p className="text-sm text-stone-500 mt-1">
          Review your details below. Once you submit, you won't be able to make changes
          until our team has reviewed your application.
        </p>
      </div>

      {/* Progress summary */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {progress.isComplete
            ? <CheckCircle2 className="w-5 h-5 text-green-500" />
            : <Clock className="w-5 h-5 text-amber-500" />
          }
          <span className="text-sm font-medium text-stone-700">
            {progress.uploadedRequired} of {progress.requiredTotal} required documents uploaded
          </span>
        </div>
        <span className="text-sm font-bold text-orange-600">{progress.percentage}%</span>
      </div>

      {/* Errors */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Missing docs warning */}
      {missingRequired.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Missing required documents: {missingRequired.map(r => r.name).join(", ")}.
            Please go back and upload them before submitting.
          </AlertDescription>
        </Alert>
      )}

      <Section icon={Building2} title="Business Details">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Legal Business Name" value={application.legalBusinessName} />
          <Field label="Country" value={application.country?.name} />
          <Field label="Vendor Type" value={
            application.vendorType?.name === "Other"
              ? application.otherVendorType
              : application.vendorType?.name
          } />
          <Field label="Registration Number" value={application.registrationNumber} />
          <Field label="Tax ID" value={application.taxId} />
        </div>
      </Section>

      <Section icon={Mail} title="Business Contact">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Business Email" value={application.businessEmail} />
          <Field label="Business Phone" value={application.businessPhone} />
        </div>
      </Section>

      <Section icon={User} title="Owner Information">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="First Name" value={application.ownerFirstName} />
          <Field label="Last Name" value={application.ownerLastName} />
          <Field label="Owner Email" value={application.ownerEmail} />
          <Field label="Owner Phone" value={application.ownerPhone} />
        </div>
      </Section>

      <Section icon={MapPin} title="Business Address">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Street Address" value={application.businessAddress} />
          <Field label="Address Line 2" value={application.addressLine2} />
          <Field label="Postal Code" value={application.postalCode} />
        </div>
      </Section>

      <Section icon={FileText} title="Uploaded Documents">
        {uploadedDocs.length === 0 ? (
          <p className="text-sm text-stone-400">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {uploadedDocs.map(req => (
              <div
                key={req.documentTypeId}
                className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-stone-800">{req.name}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {req.uploadedDocument?.documentName ?? "Unnamed file"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {req.isRequired && (
                    <span className="text-xs text-stone-400">Required</span>
                  )}
                  <DocStatusBadge status={req.uploadedDocument?.status ?? "PENDING"} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Navigation */}
      <div className="flex justify-between border-t pt-6">
        <Button
          variant="outline"
          onClick={() => router.push("/onboarding/documents")}
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Documents
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
        >
          {isSubmitting
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
            : <>Submit Application <ArrowRight className="ml-2 h-4 w-4" /></>
          }
        </Button>
      </div>

    </div>
  )
}