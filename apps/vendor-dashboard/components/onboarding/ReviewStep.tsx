"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Loader2, CheckCircle2, Building2, User, MapPin, FileText } from "lucide-react"
import { submitApplication } from "@/lib/api/onboarding"
import { useOnboardingStore } from "@/lib/state/onboarding-store"
import { DocumentStatus } from "@repo/types"
import { Button } from "@repo/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card"
import { Badge } from "@repo/ui/components/badge"
import { toast } from "sonner"
import { Separator } from "@repo/ui/components/separator"

interface ReviewSubmitProps {
  onBack: () => void
  onEdit: (step: "business-details" | "documents") => void
  onSuccess: () => void
}

export default function ReviewSubmit({ onBack, onEdit, onSuccess }: ReviewSubmitProps) {
  const { application } = useOnboardingStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)

    const { data, error } = await submitApplication()

    if (error) {
      toast({
        title: "Submission Failed",
        description: error,
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    if (data) {
      toast({
        title: "Success!",
        description: data.message,
      })
      onSuccess()
    }

    setIsSubmitting(false)
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No application data found</p>
      </div>
    )
  }

  const activeDocuments = application.documents.filter(
    (doc) => doc.status !== DocumentStatus.WITHDRAWN && !doc.supersededAt
  )

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-green-900 dark:text-green-100">
                Review Your Application
              </CardTitle>
              <CardDescription className="text-green-700 dark:text-green-300">
                Please review all information before submitting
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Business Information */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Business Information</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit("business-details")}
            >
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Country</p>
              <p className="text-base">{application.country.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Vendor Type</p>
              <p className="text-base">
                {application.vendorType.name}
                {application.otherVendorType && ` (${application.otherVendorType})`}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Legal Business Name
            </p>
            <p className="text-base font-semibold">{application.legalBusinessName}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {application.registrationNumber && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Registration Number
                </p>
                <p className="text-base">{application.registrationNumber}</p>
              </div>
            )}
            {application.taxId && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Tax ID</p>
                <p className="text-base">{application.taxId}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Business Email</p>
              <p className="text-base">{application.businessEmail}</p>
            </div>
            {application.businessPhone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Business Phone
                </p>
                <p className="text-base">{application.businessPhone}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Owner Information */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Owner Information</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit("business-details")}
            >
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Full Name</p>
            <p className="text-base font-semibold">
              {application.ownerFirstName} {application.ownerLastName}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {application.ownerPhone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Phone</p>
                <p className="text-base">{application.ownerPhone}</p>
              </div>
            )}
            {application.ownerEmail && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
                <p className="text-base">{application.ownerEmail}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Business Address */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Business Address</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit("business-details")}
            >
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-base">{application.businessAddress}</p>
            {application.addressLine2 && (
              <p className="text-base">{application.addressLine2}</p>
            )}
            {application.postalCode && (
              <p className="text-base text-muted-foreground">{application.postalCode}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Documents</CardTitle>
                <CardDescription>
                  {activeDocuments.length} document(s) uploaded
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onEdit("documents")}>
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{doc.documentName}</p>
                    {doc.documentNumber && (
                      <p className="text-xs text-muted-foreground">
                        Doc #: {doc.documentNumber}
                      </p>
                    )}
                    {(doc.issueDate || doc.expiryDate) && (
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                        {doc.issueDate && (
                          <span>Issued: {format(new Date(doc.issueDate), "PP")}</span>
                        )}
                        {doc.expiryDate && (
                          <span>Expires: {format(new Date(doc.expiryDate), "PP")}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant="outline">Pending</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Submit Section */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Ready to Submit?</CardTitle>
          <CardDescription>
            By submitting this application, you confirm that all information provided is
            accurate and complete. Your application will be reviewed within 48 hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center pt-4">
            <Button variant="outline" onClick={onBack} size="lg">
              Back to Documents
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" className="min-w-[160px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}