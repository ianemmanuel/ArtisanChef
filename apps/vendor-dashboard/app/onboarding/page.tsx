import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getApplication } from "@/lib/api"
import { Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { Badge } from "@repo/ui/components/badge"
import { Button } from "@repo/ui/components/button"
import Link from "next/link"

export default async function OnboardingIndexPage() {
  const { getToken, userId } = await auth()
  if (!userId) redirect("/sign-in")

  const token = await getToken()
  if (!token) redirect("/sign-in")

  const { data: application } = await getApplication(token)

  // No application yet → start fresh
  if (!application) {
    redirect("/onboarding/business-details")
  }

  // DRAFT → figure out where they left off
  if (application.status === "DRAFT") {
    redirect("/onboarding/business-details")
  }

  // APPROVED → go to dashboard
  if (application.status === "APPROVED") {
    redirect("/dashboard")
  }

  // SUBMITTED or UNDER_REVIEW → show status page
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
        {application.status === "UNDER_REVIEW" ? (
          <Clock className="h-8 w-8 text-orange-500" />
        ) : (
          <CheckCircle2 className="h-8 w-8 text-orange-500" />
        )}
      </div>

      <Badge
        variant="outline"
        className="mb-4 border-orange-200 bg-orange-50 text-orange-700 font-medium text-xs tracking-wide uppercase"
      >
        {application.status === "SUBMITTED" ? "Submitted" : "Under Review"}
      </Badge>

      <h1 className="text-2xl font-semibold text-stone-900 mb-3">
        {application.status === "SUBMITTED"
          ? "Application submitted!"
          : "We're reviewing your application"}
      </h1>

      <p className="text-stone-500 text-sm leading-relaxed max-w-md mx-auto mb-6">
        {application.status === "SUBMITTED"
          ? "Your vendor application has been received. Our team will review it and get back to you via email within 3–5 business days."
          : "Your application is currently under review by our team. We'll notify you by email once a decision has been made."}
      </p>

      {application.submittedAt && (
        <p className="text-xs text-stone-400 mb-8">
          Submitted on{" "}
          {new Date(application.submittedAt).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      )}

      <div className="rounded-xl border border-stone-100 bg-stone-50 p-4 text-left max-w-sm mx-auto">
        <p className="text-xs font-medium text-stone-600 mb-2">Application summary</p>
        <div className="space-y-1">
          <Row label="Business" value={application.legalBusinessName} />
          <Row label="Email" value={application.businessEmail} />
          {application.country && (
            <Row label="Country" value={application.country.name} />
          )}
          {application.vendorType && (
            <Row label="Type" value={application.vendorType.name} />
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-stone-400">{label}</span>
      <span className="text-xs font-medium text-stone-700 truncate max-w-[180px]">{value}</span>
    </div>
  )
}