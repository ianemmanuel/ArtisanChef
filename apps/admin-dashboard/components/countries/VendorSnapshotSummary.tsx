import { FileText, Clock, CheckCircle, XCircle, Briefcase, Ban, ShieldAlert } from "lucide-react"
import { EmptyState } from "@/components/shared/EmptyState"
import type { CountryVendorSnapshot } from "@repo/types/admin-app"

interface Props {
  snapshot: CountryVendorSnapshot | null
}

function Tile({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <div className="stat-card-compact">
      <div className="icon-badge icon-badge-neutral h-9 w-9 shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="stat-card-value-sm">{value.toLocaleString()}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

/**
 * Aggregate-only summary — no individual applications are listed here per
 * product requirement (that detail lives on /vendors/applications).
 */
export function VendorSnapshotSummary({ snapshot }: Props) {
  if (!snapshot) {
    return (
      <EmptyState
        icon={FileText}
        title="No vendor data yet"
        description="Vendor onboarding metrics will appear here once applications start coming in."
      />
    )
  }

  const { applications, accounts, vendorTypes } = snapshot

  return (
    <div className="admin-card space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Applications</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Tile icon={FileText}     value={applications.submitted}   label="Submitted" />
          <Tile icon={Clock}        value={applications.underReview} label="Under Review" />
          <Tile icon={CheckCircle}  value={applications.approved}    label="Approved" />
          <Tile icon={XCircle}      value={applications.rejected}    label="Rejected" />
          <Tile icon={Briefcase}    value={applications.total}       label="Total" />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Vendor Accounts</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile icon={Briefcase} value={accounts.total}     label="Total" />
          <Tile icon={CheckCircle} value={accounts.active}    label="Active" />
          <Tile icon={ShieldAlert} value={accounts.suspended} label="Suspended" />
          <Tile icon={Ban}         value={accounts.banned}    label="Banned" />
        </div>
      </div>

      {vendorTypes.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">By Vendor Type</p>
          <div className="flex flex-wrap gap-2">
            {vendorTypes.map((vt) => (
              <span key={vt.name} className="badge-neutral">
                {vt.name} · {vt.count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
