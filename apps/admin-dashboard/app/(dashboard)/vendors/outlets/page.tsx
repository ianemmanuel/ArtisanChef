import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Store, Flag, ShieldAlert, Ban, FileDown, FileClock } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table"
import { adminFetch } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { getFilterableCountries } from "@/lib/countries/filterable-countries"
import { TableFilterBar } from "@/components/shared/TableFilterBar"
import { TablePagination } from "@/components/shared/TablePagination"
import { EmptyState } from "@/components/shared/EmptyState"
import { OutletModerationActions } from "@/components/vendors/OutletModerationActions"
import { AdminPermissions } from "@repo/types/admin-app"
import type { AdminOutletListResult, OutletReviewStatus } from "@/types"

export const metadata: Metadata = { title: "Vendor Outlets" }
export const revalidate = 60

const PAGE_SIZE = 20

interface PageProps {
  searchParams: Promise<{
    page?: string; search?: string; country?: string; status?: string; adminStatus?: string
    /** Drill-down from a vendor account's own outlet table — see "View in Outlet Moderation" there. */
    vendor?: string; vendorName?: string
  }>
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "FLAGGED",           label: "Flagged" },
  { value: "",                  label: "All" },
  { value: "AUTO_APPROVED",     label: "Auto-approved" },
  { value: "MANUALLY_APPROVED", label: "Approved" },
  { value: "MANUALLY_REJECTED", label: "Rejected" },
]

const ADMIN_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ACTIVE",               label: "Active" },
  { value: "SUSPENDED",            label: "Suspended" },
  { value: "SUSPENDED_COMPLIANCE", label: "Suspended · document expired" },
  { value: "BANNED",               label: "Banned" },
]

const REVIEW_BADGE: Record<OutletReviewStatus, string> = {
  AUTO_APPROVED     : "badge-success",
  FLAGGED           : "badge-warning",
  MANUALLY_APPROVED : "badge-success",
  MANUALLY_REJECTED : "badge-danger",
}

const REVIEW_LABEL: Record<OutletReviewStatus, string> = {
  AUTO_APPROVED: "Auto-approved", FLAGGED: "Flagged", MANUALLY_APPROVED: "Approved", MANUALLY_REJECTED: "Rejected",
}

const ADMIN_STATUS_BADGE: Record<string, string> = {
  ACTIVE: "badge-success", SUSPENDED: "badge-warning", SUSPENDED_COMPLIANCE: "badge-warning", BANNED: "badge-danger",
}
const ADMIN_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active", SUSPENDED: "Suspended", SUSPENDED_COMPLIANCE: "Doc expired", BANNED: "Banned",
}

const FLAG_REASON_LABEL: Record<string, string> = {
  INAPPROPRIATE_NAME    : "Inappropriate name",
  DUPLICATE_NAME_IN_CITY: "Duplicate name in city",
  DUPLICATE_COORDINATES : "Duplicate coordinates",
}

export default async function VendorOutletsPage({ searchParams }: PageProps) {
  const session = await getAdminSession()

  if (!session.permissions.includes(AdminPermissions.VENDORS_OUTLETS_READ)) redirect("/vendors")
  const canModerate = session.permissions.includes(AdminPermissions.VENDORS_OUTLETS_MODERATE)

  const params      = await searchParams
  const page        = params.page   ?? "1"
  const search      = params.search ?? ""
  const country     = params.country ?? ""
  const vendor      = params.vendor ?? ""
  const vendorName  = params.vendorName ?? ""
  // Drilling into one vendor's outlets is a "show me everything" view, not
  // a moderation triage queue — default to All rather than Flagged so a
  // vendor with zero flagged outlets doesn't render empty.
  const status      = params.status ?? (vendor ? "" : "FLAGGED")
  const adminStatus = params.adminStatus ?? ""

  const { countries: allCountries, showFilter: showCountryFilter } = await getFilterableCountries(session.scope.isGlobal)

  const qsParams: Record<string, string> = { page, pageSize: String(PAGE_SIZE) }
  if (search)      qsParams.search       = search
  if (country)     qsParams.country      = country
  if (status)      qsParams.reviewStatus = status
  if (adminStatus) qsParams.adminStatus  = adminStatus
  if (vendor)      qsParams.vendor       = vendor
  const qs = new URLSearchParams(qsParams)

  const result = await adminFetch<AdminOutletListResult>(`/admin/v1/vendors/outlets?${qs}`, {
    next: { revalidate: 60, tags: ["vendor-outlets-admin"] },
  }).catch(() => null)

  const counts = result?.counts ?? { flagged: 0, suspended: 0, complianceSuspended: 0, banned: 0, pendingDocs: 0 }

  const statCards = [
    { label: "Flagged",       value: counts.flagged,             icon: Flag,        badgeClass: "icon-badge-warning" },
    { label: "Pending docs",  value: counts.pendingDocs,          icon: FileClock,   badgeClass: "icon-badge-warning" },
    { label: "Doc expired",   value: counts.complianceSuspended,  icon: ShieldAlert, badgeClass: "icon-badge-danger" },
    { label: "Suspended",     value: counts.suspended,            icon: ShieldAlert, badgeClass: "icon-badge-warning" },
    { label: "Banned",        value: counts.banned,               icon: Ban,         badgeClass: "icon-badge-danger" },
  ]

  return (
    <div className="page-content animate-slide-up">
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/vendors" className="hover:text-foreground transition-colors">Vendors</Link>
          <span>/</span>
          <span className="text-foreground">Outlets</span>
        </nav>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="icon-badge icon-badge-primary h-10 w-10">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Outlets</h1>
              <p className="text-sm text-muted-foreground">
                Cross-vendor outlet moderation — outlets flagged for a profane name, a duplicate name in their city, or near-duplicate coordinates, plus suspend/ban controls independent of the vendor account itself.
              </p>
            </div>
          </div>
          <a
            href={`/api/vendors/outlets/export?${qs}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3.5 py-2 text-xs font-medium text-foreground shadow-[var(--shadow-xs)] transition-colors hover:border-primary/40 hover:text-primary"
          >
            <FileDown className="h-3.5 w-3.5" />
            Export CSV
          </a>
        </div>
      </div>

      {vendor && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
          <span className="text-foreground">
            Showing outlets for <span className="font-medium">{vendorName || "this vendor"}</span> only.
          </span>
          <Link href="/vendors/outlets" className="view-all-link text-xs">Clear filter</Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {statCards.map(({ label, value, icon: Icon, badgeClass }) => (
          <div key={label} className="stat-card">
            <div className={`icon-badge h-12 w-12 ${badgeClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="stat-card-value">{value}</p>
              <p className="stat-card-label">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 p-1 w-fit">
        {STATUS_TABS.map(({ value, label }) => {
          const qp = new URLSearchParams()
          if (search)      qp.set("search", search)
          if (country)     qp.set("country", country)
          if (adminStatus) qp.set("adminStatus", adminStatus)
          if (vendor)      { qp.set("vendor", vendor); if (vendorName) qp.set("vendorName", vendorName) }
          if (value)       qp.set("status", value)
          const href = qp.toString() ? `/vendors/outlets?${qp}` : "/vendors/outlets"
          const active = status === value
          return (
            <Link
              key={value || "all"}
              href={href}
              className={[
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                active ? "bg-card text-foreground shadow-[var(--shadow-xs)]" : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {label}
            </Link>
          )
        })}
      </div>

      <TableFilterBar
        searchPlaceholder="Search outlet or business name…"
        defaultSearch={search}
        {...(showCountryFilter ? { countryOptions: allCountries.map((c) => ({ value: c.slug, label: c.name })), defaultCountry: country } : {})}
        categoryLabel="Status"
        categoryOptions={ADMIN_STATUS_OPTIONS}
        defaultCategory={adminStatus}
      />

      {!result || result.outlets.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No outlets to show"
          description="Nothing matches these filters right now."
        />
      ) : (
        <div className="admin-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs uppercase tracking-wide">Outlet</TableHead>
                  <TableHead className="hidden text-xs uppercase tracking-wide sm:table-cell">City</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Review</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
                  <TableHead className="hidden text-xs uppercase tracking-wide lg:table-cell">Flag reasons</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.outlets.map((outlet) => (
                  <TableRow key={outlet.id} className="hover:bg-muted/10">
                    <TableCell className="font-medium text-foreground">
                      <Link href={`/vendors/outlets/${outlet.id}`} className="hover:text-primary hover:underline">
                        {outlet.name}
                      </Link>
                      <p className="text-xs font-normal text-muted-foreground">
                        <Link href={`/vendors/accounts/${outlet.vendorId}`} className="hover:text-primary hover:underline">
                          {outlet.vendor.legalBusinessName}
                        </Link>
                      </p>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{outlet.city?.name ?? "—"}</TableCell>
                    <TableCell>
                      <span className={REVIEW_BADGE[outlet.reviewStatus]}>{REVIEW_LABEL[outlet.reviewStatus]}</span>
                    </TableCell>
                    <TableCell>
                      <span className={ADMIN_STATUS_BADGE[outlet.adminStatus]}>{ADMIN_STATUS_LABEL[outlet.adminStatus] ?? outlet.adminStatus}</span>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {outlet.flagReasons.length > 0
                        ? outlet.flagReasons.map((r) => FLAG_REASON_LABEL[r] ?? r).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <OutletModerationActions outlet={outlet} canModerate={canModerate} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {result && (
        <TablePagination
          total={result.total}
          page={result.page}
          totalPages={result.totalPages}
          basePath="/vendors/outlets"
          params={{ ...(search ? { search } : {}), ...(country ? { country } : {}), ...(status ? { status } : {}), ...(adminStatus ? { adminStatus } : {}), ...(vendor ? { vendor, ...(vendorName ? { vendorName } : {}) } : {}) }}
          itemLabel="outlets"
        />
      )}
    </div>
  )
}
