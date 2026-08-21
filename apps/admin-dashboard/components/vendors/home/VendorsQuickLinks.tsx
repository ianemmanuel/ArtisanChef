import Link from "next/link"
import { FileText, Building2, ArrowRight } from "lucide-react"

interface Props {
  canReadApps    : boolean
  canReadAccounts: boolean
  pendingCount   : number
  accountsCount  : number
}

/**
 * Two large entry cards into the vendors sub-areas — replaces the old
 * metric-tile grid (that data already lives on the Applications/Accounts
 * pages themselves; this page's job is orientation, not duplication).
 */
export function VendorsQuickLinks({ canReadApps, canReadAccounts, pendingCount, accountsCount }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {canReadApps && (
        <Link
          href="/vendors/applications"
          className="group admin-card flex items-start gap-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-md)]"
        >
          <div className="icon-badge icon-badge-primary h-12 w-12 shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-foreground">Applications</h2>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Claim, review, and decide on vendor onboarding applications.
            </p>
            {pendingCount > 0 && (
              <p className="mt-3 text-xs font-medium text-primary">
                {pendingCount} awaiting review
              </p>
            )}
          </div>
        </Link>
      )}

      {canReadAccounts && (
        <Link
          href="/vendors/accounts"
          className="group admin-card flex items-start gap-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-md)]"
        >
          <div className="icon-badge icon-badge-success h-12 w-12 shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-foreground">Accounts</h2>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage live vendor accounts — suspend, reinstate, or ban.
            </p>
            {accountsCount > 0 && (
              <p className="mt-3 text-xs font-medium text-muted-foreground">
                {accountsCount} active on the platform
              </p>
            )}
          </div>
        </Link>
      )}
    </div>
  )
}
