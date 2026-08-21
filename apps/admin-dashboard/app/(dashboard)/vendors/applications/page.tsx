import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { FileText, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { adminFetch }  from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { VendorApplicationsTable } from "@/components/vendors/VendorApplicationsTable"
import { TableFilterBar, type FilterStatusOption, type FilterSortOption } from "@/components/shared/TableFilterBar"
import { AdminPermissions } from "@repo/types/admin-app"
import type { ApplicationListResult } from "@/types"

export const metadata: Metadata = { title: "Vendor Applications" }
export const revalidate = 60
 
interface PageProps {
  searchParams: Promise<{
    page?     : string
    search?   : string
    status?   : string
    countryId?: string
    sort?     : string
    dir?      : string
  }>
}

const STATUS_CARDS = [
  { status: "SUBMITTED",      label: "Submitted",      icon: FileText,      badgeClass: "icon-badge-info" },
  { status: "UNDER_REVIEW",   label: "Under Review",   icon: Clock,         badgeClass: "icon-badge-warning" },
  { status: "NEEDS_REVISION", label: "Needs Revision", icon: AlertTriangle, badgeClass: "icon-badge-warning" },
  { status: "APPROVED",       label: "Approved",       icon: CheckCircle,   badgeClass: "icon-badge-success" },
  { status: "REJECTED",       label: "Rejected",       icon: XCircle,       badgeClass: "icon-badge-danger" },
]

// No DRAFT option here — a draft is the vendor's own unsubmitted
// work-in-progress and isn't open to admins at all (the backend excludes
// it from the default list and 404s a direct-id lookup too).
const STATUS_OPTIONS: FilterStatusOption[] = [
  { value: "all",            label: "All statuses",   dot: "bg-muted-foreground/40" },
  { value: "SUBMITTED",      label: "Submitted",      dot: "bg-info" },
  { value: "UNDER_REVIEW",   label: "Under Review",   dot: "bg-warning" },
  { value: "NEEDS_REVISION", label: "Needs Revision", dot: "bg-warning" },
  { value: "APPROVED",       label: "Approved",       dot: "bg-success" },
  { value: "REJECTED",       label: "Rejected",       dot: "bg-destructive" },
]

const SORT_OPTIONS: FilterSortOption[] = [
  { value: "submittedAt",       label: "Date submitted", icon: "updown" },
  { value: "createdAt",         label: "Date created",   icon: "updown" },
  { value: "legalBusinessName", label: "Business name",  icon: "az" },
]

export default async function VendorApplicationsPage({ searchParams }: PageProps) {
  const session = await getAdminSession()

  if (!session.permissions.includes(AdminPermissions.VENDORS_APPLICATIONS_READ)) {
    redirect("/vendors")
  }

  const params    = await searchParams
  const page      = params.page      ?? "1"
  const search    = params.search    ?? ""
  const status    = params.status    ?? ""
  const countryId = params.countryId ?? ""
  const sort      = params.sort      ?? "submittedAt"
  const dir       = params.dir       ?? "desc"
  // REVIEW is the base capability to act on an application at all — the
  // per-row "Review" link should be visible to anyone who can open and
  // act on an application, not just admins who specifically hold APPROVE
  // (a reviewer with only reject/needs-revision access still needs it).
  const canReview = session.permissions.includes(AdminPermissions.VENDORS_APPLICATIONS_REVIEW)

  const qs = new URLSearchParams({
    page, pageSize: "20",
    ...(search    ? { search }    : {}),
    ...(status    ? { status }    : {}),
    ...(countryId ? { countryId } : {}),
    sort,
    dir,
  })

  // Fetch count per status for overview cards + main list in parallel
  const [result, ...statusCounts] = await Promise.all([
    adminFetch<ApplicationListResult>(`/admin/v1/vendors/applications?${qs}`, {
      next: { revalidate: 60, tags: ["vendor-applications"] },
    }).catch(() => null),
    ...STATUS_CARDS.map(({ status: s }) =>
      adminFetch<ApplicationListResult>(`/admin/v1/vendors/applications?status=${s}&pageSize=1`, {
        next: { revalidate: 60, tags: ["vendor-applications"] },
      }).catch(() => ({ total: 0 }))
    ),
  ])

  return (
    <div className="page-content animate-slide-up">

      {/* Breadcrumb */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/vendors" className="hover:text-foreground transition-colors">Vendors</Link>
          <span>/</span>
          <span className="text-foreground">Applications</span>
        </nav>
        <div className="mt-2 flex items-center gap-3">
          <div className="icon-badge icon-badge-primary h-10 w-10">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Applications
            </h1>
            <p className="text-sm text-muted-foreground">
              Review and action vendor applications.
            </p>
          </div>
        </div>
      </div>

      {/* Status overview cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {STATUS_CARDS.map(({ status: s, label, icon: Icon, badgeClass }, i) => (
          <Link
            key={s}
            href={`/vendors/applications?status=${s}`}
            className={[
              "stat-card",
              status === s ? "border-primary/50" : "",
            ].join(" ")}
          >
            <div className={`icon-badge h-12 w-12 ${badgeClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="stat-card-value">
                {(statusCounts[i] as any)?.total ?? 0}
              </p>
              <p className="stat-card-label">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Filters */}
      <TableFilterBar
        searchPlaceholder="Search business or email…"
        defaultSearch={search}
        statusOptions={STATUS_OPTIONS}
        defaultStatus={status}
        sortOptions={SORT_OPTIONS}
        defaultSort={sort}
        defaultDir={dir}
      />

      {/* Table */}
      <VendorApplicationsTable
        result={result}
        page={page}
        search={search}
        status={status}
        sort={sort}
        dir={dir}
        canReview={canReview}
      />
    </div>
  )
}