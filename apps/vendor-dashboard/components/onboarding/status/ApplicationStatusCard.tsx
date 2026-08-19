import Link from "next/link"
import { Clock, Mail, Search, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ApplicationStatusBadge } from "@/components/onboarding/StatusBadge"
import { humanizeReasonCode } from "@/lib/utils/reason-code"
import type { VendorSessionApplication } from "@repo/types/vendor-app"

const COPY: Record<string, { icon: typeof Clock; title: string; body: string }> = {
  SUBMITTED: {
    icon: Clock,
    title: "Your application has been submitted",
    body: "We've received your application and it's in the queue for review. This page will update automatically once a reviewer picks it up.",
  },
  UNDER_REVIEW: {
    icon: Search,
    title: "Your application is being reviewed",
    body: "A member of our Vendor Ops team is reviewing your application now. We'll let you know as soon as there's an update.",
  },
  REJECTED: {
    icon: XCircle,
    title: "Your application wasn't approved",
    body: "Unfortunately your application doesn't meet our current requirements.",
  },
}

function formatDate(value: string | null): string | null {
  if (!value) return null
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
}

export function ApplicationStatusCard({ application }: { application: VendorSessionApplication }) {
  const copy = COPY[application.status] ?? COPY.SUBMITTED!
  const Icon = copy.icon
  const isRejected = application.status === "REJECTED"
  const submittedOn = formatDate(application.submittedAt)

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
        <div
          className={
            isRejected
              ? "flex size-14 items-center justify-center rounded-full bg-destructive-bg"
              : "flex size-14 items-center justify-center rounded-full bg-primary-subtle"
          }
        >
          <Icon className={isRejected ? "size-7 text-destructive" : "size-7 text-primary-subtle-fg"} />
        </div>

        <ApplicationStatusBadge status={application.status} />

        <h1 className="font-display text-xl font-semibold text-foreground">{copy.title}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{copy.body}</p>
        {submittedOn && !isRejected && (
          <p className="text-xs text-muted-foreground">Submitted on {submittedOn}</p>
        )}

        {isRejected && (application.reasonCode || application.rejectionReason) && (
          <div className="mt-2 w-full rounded-lg border border-border bg-muted/40 p-4 text-left">
            {application.reasonCode && (
              <p className="text-sm font-medium text-foreground">{humanizeReasonCode(application.reasonCode)}</p>
            )}
            {application.rejectionReason && (
              <p className="mt-1 text-sm text-muted-foreground">{application.rejectionReason}</p>
            )}
          </div>
        )}

        {isRejected && (
          <Button asChild variant="outline" className="mt-2 w-full sm:w-auto">
            <Link href="mailto:support@dailybread.com">
              <Mail className="size-4" /> Contact support
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
