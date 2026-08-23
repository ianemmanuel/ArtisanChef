import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { History } from "lucide-react"
import { adminFetch } from "@/lib/api"
import { TableFilterBar, type FilterStatusOption } from "@/components/shared/TableFilterBar"
import { AuditLogTable } from "@/components/identity/AuditLogTable"
import type { AdminSessionData, ApiSuccess } from "@repo/types/admin-app"
import { AdminPermissions } from "@repo/types/admin-app"
import type { ListAuditLogsResult } from "@/types"

export const metadata: Metadata = { title: "Audit Trail" }
export const revalidate = 30

interface PageProps {
  searchParams: Promise<{ page?: string; status?: string; search?: string; dateFrom?: string; dateTo?: string }>
}

// TableFilterBar's "status" slot is reused here as the action-type filter —
// same component, same query param, just relabeled — no changes needed to
// the shared filter bar itself.
const ACTION_OPTIONS: FilterStatusOption[] = [
  { value: "all",                                label: "All actions",              dot: "bg-muted-foreground/40" },
  { value: "admin_user.created",                 label: "Created",                  dot: "bg-info" },
  { value: "admin_user.invited",                 label: "Invited",                  dot: "bg-info" },
  { value: "admin_user.permissions_updated",     label: "Permissions updated",      dot: "bg-muted-foreground" },
  { value: "admin_user.role_updated",            label: "Role changed",             dot: "bg-muted-foreground" },
  { value: "admin_user.scopes_updated",          label: "Scope changed",            dot: "bg-muted-foreground" },
  { value: "admin_user.suspended",               label: "Suspended",                dot: "bg-warning" },
  { value: "admin_user.reinstated",               label: "Reinstated",               dot: "bg-success" },
  { value: "admin_user.deactivated",             label: "Deactivated",              dot: "bg-destructive" },
  { value: "admin_user.availability_changed",    label: "Availability changed",     dot: "bg-muted-foreground" },
]

export default async function IdentityAuditPage({ searchParams }: PageProps) {
  const { getToken, userId } = await auth()
  if (!userId) redirect("/sign-in")

  const token = await getToken()
  const sessionRes = await fetch(
    `${process.env.BACKEND_API_URL}/admin/v1/auth/session`,
    { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 } },
  )
  if (!sessionRes.ok) redirect("/sign-in")
  const { data: session }: ApiSuccess<AdminSessionData> = await sessionRes.json()
  if (!session.permissions.includes(AdminPermissions.AUDIT_LOGS_ALL_READ)) redirect("/overview")

  const params   = await searchParams
  const page     = params.page     ?? "1"
  const action   = params.status   ?? ""
  const search   = params.search   ?? ""
  const dateFrom = params.dateFrom ?? ""
  const dateTo   = params.dateTo   ?? ""

  const qs = new URLSearchParams({
    page, pageSize: "20",
    ...(action   && action !== "all" ? { action } : {}),
    ...(search   ? { search }   : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo   ? { dateTo }   : {}),
  })

  const result = await adminFetch<ListAuditLogsResult>(`/admin/v1/audit?${qs}`, {
    next: { revalidate: 30, tags: ["admin-audit"] },
  }).catch(() => null)

  return (
    <div className="page-content animate-slide-up">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="icon-badge icon-badge-primary h-11 w-11">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Audit Trail</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every create, invite, suspend, reinstate, deactivate, and permission/role/scope/availability change — within your scope.
            </p>
          </div>
        </div>
      </div>

      <TableFilterBar
        searchPlaceholder="Search by admin name or email…"
        defaultSearch={search}
        statusLabel="Action type"
        statusOptions={ACTION_OPTIONS}
        defaultStatus={action}
        showDateRange
        dateRangeLabel="Date range"
        defaultDateFrom={dateFrom}
        defaultDateTo={dateTo}
      />

      <AuditLogTable result={result} page={page} action={action} search={search} dateFrom={dateFrom} dateTo={dateTo} />
    </div>
  )
}
