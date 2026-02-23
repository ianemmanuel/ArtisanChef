import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Clock, FileText, AlertCircle, ArrowRight, Building2 } from "lucide-react"
import { Button } from "@repo/ui/components/button"
import { Alert, AlertDescription } from "@repo/ui/components/alert"

export const dynamic = "force-dynamic"

const backendUrl = process.env.BACKEND_API_URL!

// ─── Step indicator shown at the top of all states ───────────────────────────
function StepBar({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Business Details", "Documents", "Review & Submit"]
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const step = i + 1
        const done = step < current
        const active = step === current
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 text-sm font-medium
              ${done ? "text-green-600" : active ? "text-orange-500" : "text-stone-400"}`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${done ? "bg-green-100 text-green-600" : active ? "bg-orange-100 text-orange-600" : "bg-stone-100 text-stone-400"}`}
              >
                {done ? "✓" : step}
              </span>
              {label}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-8 ${done ? "bg-green-300" : "bg-stone-200"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default async function OnboardingPage() {
  const { getToken, userId } = await auth()
  if (!userId) redirect("/sign-in")

  const token = await getToken()
  if (!token) redirect("/sign-in")

  const headers = { Authorization: `Bearer ${token}` }

  // Fetch application — if none exists, go straight to step 1
  const appRes = await fetch(`${backendUrl}/vendor/v1/application`, {
    headers,
    cache: "no-store",
  })
  const appJson = await appRes.json()

  // No application at all — send to step 1
  if (!appRes.ok || appJson.status !== "success") {
    redirect("/onboarding/business-details")
  }

  const application = appJson.data

  // APPROVED — send to vendor dashboard
  if (application.status === "APPROVED") {
    redirect("/dashboard")
  }

  // DRAFT — figure out which step they're on
  if (application.status === "DRAFT") {
    // Check if they have any uploaded docs to determine step
    const hasDocuments = application.documents?.some(
      (d: any) => d.status !== "WITHDRAWN"
    )

    // If no docs yet, send to documents page
    if (!hasDocuments) {
      redirect("/onboarding/documents")
    }

    // Has docs — send to review
    redirect("/onboarding/review")
  }

  // ── For SUBMITTED, UNDER_REVIEW, REJECTED — render the hub page ──────────

  return (
    <div className="min-h-screen bg-stone-50 flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-stone-900">Vendor Application</h1>
            <p className="text-sm text-stone-500">DailyBread Vendor Portal</p>
          </div>
        </div>

        {/* SUBMITTED */}
        {application.status === "SUBMITTED" && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
            <StepBar current={3} />
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold text-stone-900 mb-2">Application Submitted</h2>
              <p className="text-stone-500 max-w-md">
                Your application has been submitted and is waiting to be reviewed by our team.
                We'll notify you by email once a decision has been made.
              </p>
              <div className="mt-6 bg-blue-50 rounded-xl px-6 py-4 text-sm text-blue-700">
                Submitted on{" "}
                {application.submittedAt
                  ? new Date(application.submittedAt).toLocaleDateString("en-US", {
                      day: "numeric", month: "long", year: "numeric",
                    })
                  : "—"}
              </div>
            </div>
          </div>
        )}

        {/* UNDER_REVIEW */}
        {application.status === "UNDER_REVIEW" && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
            <StepBar current={3} />
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-semibold text-stone-900 mb-2">Under Review</h2>
              <p className="text-stone-500 max-w-md">
                Our team is currently reviewing your application and documents.
                This usually takes 2–3 business days. We'll reach out if we need anything.
              </p>
            </div>
          </div>
        )}

        {/* REJECTED */}
        {application.status === "REJECTED" && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
            <StepBar current={1} />
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-stone-900 mb-2">Application Rejected</h2>
              <p className="text-stone-500 max-w-md mb-6">
                Unfortunately your application was not approved. Please review the reason below,
                update your details and documents, and resubmit.
              </p>

              {(application.rejectionReason || application.revisionNotes) && (
                <Alert variant="destructive" className="text-left mb-6 max-w-md">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {application.rejectionReason && (
                      <p className="font-medium mb-1">{application.rejectionReason}</p>
                    )}
                    {application.revisionNotes && (
                      <p className="text-sm">{application.revisionNotes}</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white">
                <Link href="/onboarding/business-details">
                  Revise Application <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}