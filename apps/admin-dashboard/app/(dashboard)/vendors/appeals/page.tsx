import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Scale, Clock, Gavel, CheckCircle2 } from "lucide-react"
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
import { VendorAppealActions } from "@/components/vendors/VendorAppealActions"
import { AdminPermissions } from "@repo/types/admin-app"
import type { VendorAppealListResult, AppealStatus, AppealSubjectType } from "@/types"

export const metadata: Metadata = { title: "Vendor Appeals" }
export const revalidate = 60

const PAGE_SIZE = 20

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; country?: string; type?: string; status?: string }>
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "",             label: "All" },
  { value: "OPEN",         label: "Open" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "UPHELD",       label: "Upheld" },
  { value: "OVERTURNED",   label: "Overturned" },
]

const SUBJECT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "APPLICATION_REJECTION", label: "Application Rejection" },
  { value: "ACCOUNT_SUSPENSION",    label: "Account Suspension" },
  { value: "ACCOUNT_BAN",           label: "Account Ban" },
]

const STATUS_BADGE: Record<AppealStatus, string> = {
  OPEN        : "badge-neutral",
  UNDER_REVIEW: "badge-warning",
  UPHELD      : "badge-danger",
  OVERTURNED  : "badge-success",
}

const STATUS_LABEL: Record<AppealStatus, string> = {
  OPEN: "Open", UNDER_REVIEW: "Under Review", UPHELD: "Upheld", OVERTURNED: "Overturned",
}

const SUBJECT_TYPE_LABEL: Record<AppealSubjectType, string> = {
  APPLICATION_REJECTION: "Application Rejection",
  ACCOUNT_SUSPENSION   : "Account Suspension",
  ACCOUNT_BAN          : "Account Ban",
}

export default async function VendorAppealsPage({ searchParams }: PageProps) {
  const session = await getAdminSession()

  if (!session.permissions.includes(AdminPermissions.VENDORS_APPEALS_READ)) redirect("/vendors")
  const canManage = session.permissions.includes(AdminPermissions.VENDORS_APPEALS_MANAGE)

  const params  = await searchParams
  const page    = params.page   ?? "1"
  const search  = params.search ?? ""
  const country = params.country ?? ""
  const type    = params.type   ?? ""
  const status  = params.status ?? ""

  const { countries: allCountries, showFilter: showCountryFilter } = await getFilterableCountries(session.scope.isGlobal)

  const qsParams: Record<string, string> = { page, pageSize: String(PAGE_SIZE) }
  if (search)  qsParams.search      = search
  if (country) qsParams.countrySlug = country
  if (type)    qsParams.subjectType = type
  if (status)  qsParams.status      = status
  const qs = new URLSearchParams(qsParams)

  const result = await adminFetch<VendorAppealListResult>(`/admin/v1/vendors/appeals?${qs}`, {
    next: { revalidate: 60, tags: ["vendor-appeals"] },
  }).catch(() => null)

  const openCount   = result?.appeals.filter((a) => a.status === "OPEN").length ?? 0
  const reviewCount = result?.appeals.filter((a) => a.status === "UNDER_REVIEW").length ?? 0
  const resolvedCount = result?.appeals.filter((a) => a.status === "UPHELD" || a.status === "OVERTURNED").length ?? 0

  const statCards = [
    { label: "Open",         value: openCount,     icon: Scale,        badgeClass: "icon-badge-primary" },
    { label: "Under Review", value: reviewCount,   icon: Clock,        badgeClass: "icon-badge-warning" },
    { label: "Resolved",     value: resolvedCount, icon: CheckCircle2, badgeClass: "icon-badge-success" },
  ]

  return (
    <div className="page-content animate-slide-up">
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/vendors" className="hover:text-foreground transition-colors">Vendors</Link>
          <span>/</span>
          <span className="text-foreground">Appeals</span>
        </nav>
        <div className="mt-2 flex items-center gap-3">
          <div className="icon-badge icon-badge-primary h-10 w-10">
            <Gavel className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Appeals</h1>
            <p className="text-sm text-muted-foreground">
              Formal appeals against a rejected application, account suspension, or ban — logged on behalf of a vendor who raised it through another channel.
            </p>
          </div>
        </div>
      </div>

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
          if (search)  qp.set("search", search)
          if (country) qp.set("country", country)
          if (type)    qp.set("type", type)
          if (value)   qp.set("status", value)
          const href = qp.toString() ? `/vendors/appeals?${qp}` : "/vendors/appeals"
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
        searchPlaceholder="Search business name…"
        defaultSearch={search}
        {...(showCountryFilter ? { countryOptions: allCountries.map((c) => ({ value: c.slug, label: c.name })), defaultCountry: country } : {})}
        categoryLabel="Subject Type"
        categoryOptions={SUBJECT_TYPE_OPTIONS}
        defaultCategory={type}
      />

      {!result || result.appeals.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No appeals logged"
          description="Nothing to show for these filters. Log an appeal from a rejected application or a suspended/banned vendor's detail page."
        />
      ) : (
        <div className="admin-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs uppercase tracking-wide">Vendor</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Type</TableHead>
                  <TableHead className="hidden text-xs uppercase tracking-wide sm:table-cell">Status</TableHead>
                  <TableHead className="hidden text-xs uppercase tracking-wide lg:table-cell">Reason</TableHead>
                  <TableHead className="hidden text-xs uppercase tracking-wide md:table-cell">Assigned</TableHead>
                  <TableHead className="hidden text-xs uppercase tracking-wide md:table-cell">Logged</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.appeals.map((appeal) => (
                  <TableRow key={appeal.id} className="hover:bg-muted/10">
                    <TableCell className="font-medium text-foreground">
                      {appeal.subjectType === "APPLICATION_REJECTION" ? (
                        <Link href={`/vendors/applications/${appeal.applicationId}`} className="hover:text-primary hover:underline">
                          {appeal.subjectName}
                        </Link>
                      ) : (
                        <Link href={`/vendors/accounts/${appeal.vendorId}`} className="hover:text-primary hover:underline">
                          {appeal.subjectName}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{SUBJECT_TYPE_LABEL[appeal.subjectType]}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className={STATUS_BADGE[appeal.status]}>{STATUS_LABEL[appeal.status]}</span>
                    </TableCell>
                    <TableCell className="hidden max-w-xs truncate text-sm text-muted-foreground lg:table-cell" title={appeal.reason}>
                      {appeal.reason}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {appeal.assignedReviewerName ?? "Unassigned"}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {new Date(appeal.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <VendorAppealActions appeal={appeal} canManage={canManage} />
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
          basePath="/vendors/appeals"
          params={{ ...(search ? { search } : {}), ...(country ? { country } : {}), ...(type ? { type } : {}), ...(status ? { status } : {}) }}
          itemLabel="appeals"
        />
      )}
    </div>
  )
}
