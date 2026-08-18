import { AlertTriangle } from "lucide-react"
import { humanizeReasonCode } from "@/lib/utils/reason-code"

export function RevisionBanner({
  reasonCode,
  rejectionReason,
  revisionNotes,
}: {
  reasonCode: string | null
  rejectionReason: string | null
  revisionNotes: string | null
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-warning/30 bg-warning-bg p-4">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {reasonCode ? humanizeReasonCode(reasonCode) : "Changes requested"}
        </p>
        {rejectionReason && <p className="text-sm text-foreground/90">{rejectionReason}</p>}
        {revisionNotes && <p className="text-sm text-muted-foreground">{revisionNotes}</p>}
        <p className="text-xs text-muted-foreground">
          Update the fields below and resubmit — the same reviewer will pick your application back up.
        </p>
      </div>
    </div>
  )
}
