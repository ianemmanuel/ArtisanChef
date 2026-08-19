"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle2, CircleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useSubmitApplication } from "@/lib/queries/onboarding"
import { ClientApiError } from "@/lib/api/client"
import type { ApplicationPreview } from "@/lib/api/types"

const FIELD_LABELS: Record<string, string> = {
  legalBusinessName: "Legal business name",
  registrationNumber: "Registration number",
  businessEmail: "Business email",
  businessPhone: "Business phone",
  taxId: "Tax ID",
  ownerFirstName: "Owner first name",
  ownerLastName: "Owner last name",
  businessAddress: "Business address",
}

function SummaryRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value || "—"}</span>
    </div>
  )
}

export function ReviewSummary({ preview }: { preview: ApplicationPreview }) {
  const router = useRouter()
  const submit = useSubmitApplication()
  const { application, requirements, missingFields, canSubmit } = preview

  async function handleSubmit() {
    try {
      await submit.mutateAsync()
      router.push("/application/status")
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Couldn't submit your application.")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <SummaryRow label="Legal business name" value={application.legalBusinessName} />
          <SummaryRow label="Registration number" value={application.registrationNumber} />
          <SummaryRow label="Tax ID" value={application.taxId} />
          <SummaryRow label="Business email" value={application.businessEmail} />
          <SummaryRow label="Business phone" value={application.businessPhone} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Owner</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <SummaryRow label="Name" value={[application.ownerFirstName, application.ownerLastName].filter(Boolean).join(" ")} />
          <SummaryRow label="Phone" value={application.ownerPhone} />
          <SummaryRow label="Email" value={application.ownerEmail} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <SummaryRow label="Address" value={application.businessAddress} />
          <SummaryRow label="Address line 2" value={application.addressLine2} />
          <SummaryRow label="Postal code" value={application.postalCode} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {requirements.map((req) => (
            <div key={req.documentTypeId} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{req.name}</span>
              {req.uploaded ? (
                <Badge variant="outline" className="bg-success-bg text-success">
                  <CheckCircle2 className="size-3" /> Uploaded
                </Badge>
              ) : (
                <Badge variant="outline" className={req.isRequired ? "bg-destructive-bg text-destructive" : "bg-muted text-muted-foreground"}>
                  {req.isRequired ? "Missing" : "Not uploaded"}
                </Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {!canSubmit && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-bg p-4 text-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium text-foreground">A few things need your attention before you can submit</p>
            {missingFields.length > 0 && (
              <p className="mt-1 text-muted-foreground">
                Missing: {missingFields.map((f) => FIELD_LABELS[f] ?? f).join(", ")}
              </p>
            )}
          </div>
        </div>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/onboarding/business">
            <ArrowLeft className="size-4" /> Back to edit
          </Link>
        </Button>
        <Button size="lg" disabled={!canSubmit || submit.isPending} onClick={handleSubmit}>
          {submit.isPending ? "Submitting..." : "Submit application"}
        </Button>
      </div>
    </div>
  )
}
