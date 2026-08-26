import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ShieldAlert, AlertTriangle, Clock, Users, Settings2, ArrowUpRight, FileX2, ShieldCheck, FileDown } from "lucide-react"
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
import { TableFilterBar, type FilterSelectOption } from "@/components/shared/TableFilterBar"
import { TablePagination } from "@/components/shared/TablePagination"
import { EmptyState } from "@/components/shared/EmptyState"
import { ComplianceIssueActions } from "@/components/vendors/ComplianceIssueActions"
import { ComplianceIssueBadge } from "@/components/vendors/ComplianceIssueBadge"
import { getInitials } from "@/lib/initials"
import { AdminPermissions } from "@repo/types/admin-app"
import type { ComplianceOverviewResult, ComplianceSeverity } from "@/types"
import type { DocumentTypeListResult } from "@/types/document-type.types"

export const metadata: Metadata = { title: "Vendor Compliance" }
export const revalidate = 60

const PAGE_SIZE = 20

interface PageProps {
  searchParams: Promise<{
    page?: string; search?: string; country?: string; docType?: string; status?: string; queue?: string
  }>
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "",              label: "All Issues" },
  { value: "MISSING",       label: "Missing" },
  { value: "EXPIRED",       label: "Expired" },
  { value: "EXPIRING_SOON", label: "Expiring Soon" },
  { value: "WAIVED",        label: "Waived" },
]

// Same three-pill "what should I be working on" concept as the vendor
// applications queue, applied to compliance cases.
const QUEUE_OPTIONS: { value: string; label: string }[] = [
  { value: "",           label: "All" },
  { value: "mine",       label: "My Cases" },
  { value: "unclaimed",  label: "Unclaimed" },
  { value: "escalated",  label: "Escalated" },
]

const SEVERITY_LABEL: Record<ComplianceSeverity, string> = { CRITICAL: "Critical", MEDIUM: "Medium", LOW: "Low" }
const SEVERITY_CLASS: Record<ComplianceSeverity, string> = {
  CRITICAL: "badge-danger", MEDIUM: "badge-warning", LOW: "badge-neutral",
}

// Mirrors COMPLIANCE_CASE_STALE_DAYS in apps/backend/src/constants/vendor.ts
// (the reconciliation cron auto-escalates an OPEN case past this age) —
// used here purely for the visual "this has sat too long" cue.
const STALE_CASE_DAYS = 7

function caseAgeDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
}

export default async function VendorCompliancePage({ searchParams }: PageProps) {
  const session = await getAdminSession()

  // Its own dedicated permission — viewing the compliance queue is gated
  // separately from the vendor directory in general (see CLAUDE.md).
  if (!session.permissions.includes(AdminPermissions.VENDORS_COMPLIANCE_READ)) redirect("/vendors")

  const canManage    = session.permissions.includes(AdminPermissions.VENDORS_ACCOUNTS_COMPLIANCE_MANAGE)
  const canClaim     = session.permissions.includes(AdminPermissions.VENDORS_COMPLIANCE_CLAIM)
  const canEscalate  = session.permissions.includes(AdminPermissions.VENDORS_COMPLIANCE_ESCALATE)
  const canReassign  = session.permissions.includes(AdminPermissions.VENDORS_COMPLIANCE_REASSIGN)
  const showQueuePills = canClaim || canEscalate

  const params  = await searchParams
  const page    = params.page   ?? "1"
  const search  = params.search ?? ""
  const country = params.country ?? ""
  const docType = params.docType ?? ""
  const status  = params.status ?? ""
  const queue   = params.queue  ?? ""

  const { countries: allCountries, showFilter: showCountryFilter } = await getFilterableCountries(session.scope.isGlobal)

  // A country-scoped admin has an implicit country even without a picker —
  // needed below to resolve the document-type filter's catalog. A global
  // admin only gets one once they've actually picked a country from the
  // filter (document types are a per-country catalog, see note below).
  const ownCountry = !session.scope.isGlobal ? allCountries[0] : undefined
  const activeCountry = ownCountry ?? allCountries.find((c) => c.slug === country)

  // Document types are inherently country-scoped rows in the schema
  // (DocumentTypeConfig.countryId is required — "Business License" in
  // Kenya and "Business License" in Nigeria are two distinct config rows,
  // even with the same name) — there's no cross-country document-type
  // identity to filter by. So this picker only populates once a single
  // country is in view (the admin's own, or one a global admin selected),
  // same reasoning as why /vendor-categories' pickers gate on scope shape
  // rather than always being present.
  const canReadDocTypes = session.permissions.includes(AdminPermissions.SETTINGS_DOCUMENTS_READ)
  const docTypesResult = canReadDocTypes && activeCountry
    ? await adminFetch<DocumentTypeListResult>(
        `/admin/v1/document-types?countryId=${activeCountry.id}&status=ACTIVE&scope=VENDOR&pageSize=200`,
        { next: { revalidate: 300, tags: [`document-types-${activeCountry.id}`] } },
      ).catch(() => null)
    : null
  const docTypeOptions: FilterSelectOption[] = (docTypesResult?.documentTypes ?? []).map((d) => ({
    value: d.id, label: d.name,
  }))

  const qsParams: Record<string, string> = { page, pageSize: String(PAGE_SIZE) }
  if (search) qsParams.search = search
  if (country) qsParams.countrySlug = country
  if (docType) qsParams.documentTypeId = docType
  if (status) qsParams.status = status
  if (queue) qsParams.queue = queue
  const qs = new URLSearchParams(qsParams)

  const result = await adminFetch<ComplianceOverviewResult>(`/admin/v1/vendors/compliance/overview?${qs}`, {
    next: { revalidate: 60, tags: ["vendor-compliance"] },
  }).catch(() => null)

  const openIssues = (result?.missingCount ?? 0) + (result?.expiredCount ?? 0) + (result?.expiringCount ?? 0)
  const statCards = [
    { label: "Open Issues",     value: openIssues,                       icon: ShieldAlert,   badgeClass: "icon-badge-primary" },
    { label: "Missing",         value: result?.missingCount ?? 0,        icon: FileX2,        badgeClass: "icon-badge-danger" },
    { label: "Expired",         value: result?.expiredCount ?? 0,        icon: AlertTriangle, badgeClass: "icon-badge-danger" },
    { label: "Expiring Soon",   value: result?.expiringCount ?? 0,       icon: Clock,         badgeClass: "icon-badge-warning" },
    { label: "Waived",          value: result?.waivedCount ?? 0,         icon: ShieldCheck,   badgeClass: "icon-badge-success" },
    { label: "Vendors Affected", value: result?.affectedVendorCount ?? 0, icon: Users,        badgeClass: "icon-badge-info" },
  ]

  return (
    <div className="page-content animate-slide-up">
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/vendors" className="hover:text-foreground transition-colors">Vendors</Link>
          <span>/</span>
          <span className="text-foreground">Compliance</span>
        </nav>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="icon-badge icon-badge-primary h-10 w-10">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Compliance</h1>
              <p className="text-sm text-muted-foreground">
                Vendors missing a required document, or with one expired or approaching expiry, across your scope.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Roadmap VM-P2-01 (CLAUDE.md) — packages the same filtered
                list already on screen, doesn't page it. */}
            <a
              href={`/api/vendors/compliance/export?${qs}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3.5 py-2 text-xs font-medium text-foreground shadow-[var(--shadow-xs)] transition-colors hover:border-primary/40 hover:text-primary"
            >
              <FileDown className="h-3.5 w-3.5" />
              Export CSV
            </a>
            {activeCountry && canReadDocTypes && (
              <Link
                href={`/countries/${activeCountry.slug}/documents`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3.5 py-2 text-xs font-medium text-foreground shadow-[var(--shadow-xs)] transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Manage document types for {activeCountry.name}
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Status overview */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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

      {/* Operational queue — who's working on what, distinct from the
          missing/expired/expiring breakdown below. Only shown to admins
          who can actually own a case. */}
      {showQueuePills && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 p-1 w-fit">
          {QUEUE_OPTIONS.map(({ value, label }) => {
            const qp = new URLSearchParams()
            if (status)  qp.set("status", status)
            if (country) qp.set("country", country)
            if (docType) qp.set("docType", docType)
            if (value)   qp.set("queue", value)
            const href = qp.toString() ? `/vendors/compliance?${qp}` : "/vendors/compliance"
            const active = queue === value
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
      )}

      {/* Status tabs */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 p-1 w-fit">
        {STATUS_TABS.map(({ value, label }) => {
          const qp = new URLSearchParams()
          if (search)  qp.set("search", search)
          if (country) qp.set("country", country)
          if (docType) qp.set("docType", docType)
          if (queue)   qp.set("queue", queue)
          if (value)   qp.set("status", value)
          const href = qp.toString() ? `/vendors/compliance?${qp}` : "/vendors/compliance"
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

      {/* Filters */}
      <TableFilterBar
        searchPlaceholder="Search business name…"
        defaultSearch={search}
        {...(showCountryFilter ? { countryOptions: allCountries.map((c) => ({ value: c.slug, label: c.name })), defaultCountry: country } : {})}
        {...(docTypeOptions.length > 0 ? { docTypeOptions, defaultDocType: docType } : {})}
      />
      {canReadDocTypes && !activeCountry && (
        <p className="-mt-4 text-xs text-muted-foreground">
          Select a country above to filter by a specific document type — document types are defined per country.
        </p>
      )}

      {/* Table */}
      {!result || result.issues.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No compliance issues"
          description="Nothing missing, expired, or expiring in your scope right now — adjust filters if you expected results."
        />
      ) : (
        <div className="admin-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs uppercase tracking-wide">Vendor</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Document Type</TableHead>
                  <TableHead className="hidden text-xs uppercase tracking-wide sm:table-cell">Status</TableHead>
                  <TableHead className="hidden text-xs uppercase tracking-wide md:table-cell">Severity</TableHead>
                  <TableHead className="hidden text-xs uppercase tracking-wide lg:table-cell">Owner</TableHead>
                  <TableHead className="hidden text-xs uppercase tracking-wide md:table-cell">Expiry Date</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.issues.map((issue) => (
                  <TableRow key={issue.id} className="hover:bg-muted/10">
                    <TableCell>
                      <Link href={`/vendors/accounts/${issue.vendor.id}`} className="group flex items-center gap-3">
                        <div className="avatar-circle h-8 w-8 text-xs">
                          {getInitials(issue.vendor.legalBusinessName)}
                        </div>
                        <span className="min-w-0 truncate font-medium text-foreground transition-colors group-hover:text-primary">
                          {issue.vendor.legalBusinessName}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{issue.documentType.name}</TableCell>
                    <TableCell className="hidden sm:table-cell"><ComplianceIssueBadge issue={issue} /></TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className={SEVERITY_CLASS[issue.severity]}>{SEVERITY_LABEL[issue.severity]}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>
                          {issue.case?.escalatedByAdminId
                            ? <span className="text-destructive">Escalated{issue.case.escalatedByAdminName ? ` by ${issue.case.escalatedByAdminName}` : ""}</span>
                            : issue.case?.assignedReviewerId
                              ? issue.case.assignedReviewerName ?? "Claimed"
                              : "Unclaimed"}
                        </span>
                        {issue.case && (() => {
                          const age = caseAgeDays(issue.case.createdAt)
                          const stale = age >= STALE_CASE_DAYS && issue.case.status === "OPEN"
                          return (
                            <span className={stale ? "font-medium text-warning" : ""}>
                              · {age === 0 ? "today" : `${age}d`}
                            </span>
                          )
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="font-mono text-xs text-muted-foreground">
                        {issue.expiryDate ? new Date(issue.expiryDate).toLocaleDateString() : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <ComplianceIssueActions issue={issue} canManage={canManage} canClaim={canClaim} canEscalate={canEscalate} canReassign={canReassign} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            total={result.total}
            page={page}
            totalPages={result.totalPages}
            basePath="/vendors/compliance"
            params={{
              ...(search  ? { search }  : {}),
              ...(country ? { country } : {}),
              ...(docType ? { docType } : {}),
              ...(status  ? { status }  : {}),
              ...(queue   ? { queue }   : {}),
            }}
            itemLabel="issues"
          />
        </div>
      )}
    </div>
  )
}
