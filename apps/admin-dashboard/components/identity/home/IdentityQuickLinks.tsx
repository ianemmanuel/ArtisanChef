import Link from "next/link"
import { Users, UserPlus, ArrowRight } from "lucide-react"

interface Props {
  canManage    : boolean
  canCreate    : boolean
  totalCount   : number
  pendingCount : number
}

/**
 * Two large entry cards into the identity sub-areas — mirrors
 * VendorsQuickLinks. This page's job is orientation, not duplicating the
 * stats/table that already live on /identity/manage.
 */
export function IdentityQuickLinks({ canManage, canCreate, totalCount, pendingCount }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {canManage && (
        <Link
          href="/identity/manage"
          className="group admin-card flex items-start gap-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-md)]"
        >
          <div className="icon-badge icon-badge-primary h-12 w-12 shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-foreground">Manage Admins</h2>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse admin users — edit roles, permissions, scope, and lifecycle status.
            </p>
            <p className="mt-3 text-xs font-medium text-muted-foreground">
              {totalCount} admin{totalCount === 1 ? "" : "s"} on the platform
              {pendingCount > 0 && (
                <span className="text-primary"> · {pendingCount} awaiting invitation</span>
              )}
            </p>
          </div>
        </Link>
      )}

      {canCreate && (
        <Link
          href="/identity/new"
          className="group admin-card flex items-start gap-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-md)]"
        >
          <div className="icon-badge icon-badge-success h-12 w-12 shrink-0">
            <UserPlus className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-foreground">Add Admin User</h2>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a new admin, assign their role and permissions, then send their invitation.
            </p>
          </div>
        </Link>
      )}
    </div>
  )
}
