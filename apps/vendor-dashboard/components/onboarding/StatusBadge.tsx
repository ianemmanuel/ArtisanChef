import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { VendorApplicationStatus } from "@repo/types/vendor-app"

const STATUS_CONFIG: Record<VendorApplicationStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground border-transparent" },
  SUBMITTED: { label: "Submitted", className: "bg-info-bg text-info border-transparent" },
  UNDER_REVIEW: { label: "Under review", className: "bg-info-bg text-info border-transparent" },
  NEEDS_REVISION: { label: "Needs revision", className: "bg-warning-bg text-warning border-transparent" },
  APPROVED: { label: "Approved", className: "bg-success-bg text-success border-transparent" },
  REJECTED: { label: "Rejected", className: "bg-destructive-bg text-destructive border-transparent" },
}

export function ApplicationStatusBadge({ status, className }: { status: VendorApplicationStatus; className?: string }) {
  const config = STATUS_CONFIG[status]

  return (
    <Badge variant="outline" className={cn(config.className, "font-medium", className)}>
      {config.label}
    </Badge>
  )
}
