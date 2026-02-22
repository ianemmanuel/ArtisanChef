"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import {
  Loader2,
  CheckCircle2,
  Building2,
  User,
  MapPin,
  FileText,
} from "lucide-react"
import { Button } from "@repo/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card"
import { Badge } from "@repo/ui/components/badge"
import { Separator } from "@repo/ui/components/separator"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ReviewStepProps {
  onBack: () => void
  onEdit: (step: "business-details" | "documents") => void
}

export default function ReviewStep({
  onBack,
  onEdit,
}: ReviewStepProps) {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [data, setData] = useState<any>(null)

  // Fetch preview from route handler
  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await fetch("/api/vendor/application/preview", {
          cache: "no-store",
        })

        const json = await res.json()

        if (!res.ok) {
          toast.error(json.message || "Failed to load preview")
          return
        }

        setData(json.data)
      } catch (err) {
        toast.error("Failed to load preview")
      } finally {
        setLoading(false)
      }
    }

    fetchPreview()
  }, [])

  const handleSubmit = async () => {
    setSubmitting(true)

    try {
      const res = await fetch("/api/vendor/application/submit", {
        method: "POST",
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.message || "Submission failed")
        setSubmitting(false)
        return
      }

      toast.success("Application submitted successfully")
      router.push("/vendor/application-status")
    } catch (err) {
      toast.error("Submission failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Unable to load application preview
        </p>
      </div>
    )
  }

  const { application, progress, canSubmit } = data

  const activeDocuments = application.documents.filter(
    (doc: any) => doc.status !== "WITHDRAWN" && !doc.supersededAt
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <CardTitle>Review Your Application</CardTitle>
              <CardDescription>
                Completion: {progress.percentage}%
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Business Info */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Business Information</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit("business-details")}
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p><strong>Legal Name:</strong> {application.legalBusinessName}</p>
          <p><strong>Country:</strong> {application.country.name}</p>
          <p><strong>Vendor Type:</strong> {application.vendorType.name}</p>
          <Separator />
          <p><strong>Email:</strong> {application.businessEmail}</p>
          <p><strong>Owner:</strong> {application.ownerFirstName} {application.ownerLastName}</p>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Documents</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit("documents")}
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeDocuments.map((doc: any) => (
            <div
              key={doc.id}
              className="flex justify-between items-center border p-3 rounded-lg"
            >
              <div>
                <p className="font-medium">{doc.documentName}</p>
                {doc.issueDate && (
                  <p className="text-xs text-muted-foreground">
                    Issued: {format(new Date(doc.issueDate), "PP")}
                  </p>
                )}
              </div>
              <Badge variant="outline">Uploaded</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Submit */}
      <Card>
        <CardContent className="flex justify-between items-center pt-6">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="min-w-40"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Application"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
