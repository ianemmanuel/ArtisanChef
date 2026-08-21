import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Tag, CheckCircle2, Ban, Layers } from "lucide-react"
import { adminFetch } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { AdminPermissions } from "@repo/types/admin-app"
import { TableFilterBar, type FilterStatusOption } from "@/components/shared/TableFilterBar"
import { VendorTypesTable } from "@/components/vendor-types/VendorTypesTable"
import { VendorTypeFormDialog } from "@/components/vendor-types/VendorTypeFormDialog"
import type { VendorTypeListResult, CountryListLite, CountryLite } from "@/types/vendor-type.types"

export const metadata: Metadata = { title: "Vendor Types" }
export const revalidate = 60

const PAGE_SIZE = 10

const STATUS_OPTIONS: FilterStatusOption[] = [
  { value: "ACTIVE",    label: "Active",    dot: "bg-success" },
  { value: "SUSPENDED", label: "Suspended", dot: "bg-warning" },
]

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; status?: string; country?: string }>
}

export default async function VendorTypesPage({ searchParams }: PageProps) {
  const session = await getAdminSession()

  if (!session.permissions.includes(AdminPermissions.SETTINGS_VENDOR_TYPES_READ)) redirect("/vendors")

  // Backend requires global scope for every mutation on this resource —
  // a country-scoped admin would 403 even holding the WRITE permission key.
  const canWrite = session.scope.isGlobal
    && session.permissions.includes(AdminPermissions.SETTINGS_VENDOR_TYPES_WRITE)

  const params  = await searchParams
  const page    = params.page    ?? "1"
  const search  = params.search  ?? ""
  const status  = params.status  ?? ""
  const country = params.country ?? ""

  // Global admins can narrow the catalog to one of their countries via
  // ?country=<id> (passed to the backend as countryId). Country-tier admins
  // never pass countryId at all — the backend already narrows automatically
  // to their own country, so widening isn't even offered as an option.
  const countries = session.scope.isGlobal
    ? await adminFetch<CountryListLite>("/admin/v1/countries?status=ACTIVE&pageSize=200", {
        next: { revalidate: 300, tags: ["active-countries"] },
      }).then((r) => r.countries).catch(() => [] as CountryLite[])
    : ([] as CountryLite[])

  const countryId = session.scope.isGlobal && country && country !== "all" ? country : ""

  const qs = new URLSearchParams({
    page, pageSize: String(PAGE_SIZE),
    ...(search ? { search } : {}),
    ...(status && status !== "all" ? { status } : {}),
    ...(countryId ? { countryId } : {}),
  })

  // Headline stat counts stay independent of the search/status filters
  // (same convention as /vendors/accounts and /vendors/applications) but do
  // respect the country narrowing, since that changes the effective scope.
  const countryQs = countryId ? `&countryId=${countryId}` : ""

  const [result, activeResult, suspendedResult] = await Promise.all([
    adminFetch<VendorTypeListResult>(`/admin/v1/vendor-types?${qs}`, {
      next: { revalidate: 60, tags: ["vendor-types"] },
    }).catch(() => null),
    adminFetch<VendorTypeListResult>(`/admin/v1/vendor-types?status=ACTIVE&pageSize=1${countryQs}`, {
      next: { revalidate: 60, tags: ["vendor-types"] },
    }).catch(() => null),
    adminFetch<VendorTypeListResult>(`/admin/v1/vendor-types?status=SUSPENDED&pageSize=1${countryQs}`, {
      next: { revalidate: 60, tags: ["vendor-types"] },
    }).catch(() => null),
  ])

  const statCards = [
    { label: "Total",     count: result?.total ?? 0,          icon: Layers,       badgeClass: "icon-badge-primary" },
    { label: "Active",    count: activeResult?.total ?? 0,    icon: CheckCircle2, badgeClass: "icon-badge-success" },
    { label: "Suspended", count: suspendedResult?.total ?? 0, icon: Ban,          badgeClass: "icon-badge-warning" },
  ]

  return (
    <div className="page-content animate-slide-up">
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/vendors" className="hover:text-foreground transition-colors">Vendors</Link>
          <span>/</span>
          <span className="text-foreground">Vendor Types</span>
        </nav>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="icon-badge icon-badge-primary h-10 w-10">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Vendor Types</h1>
              <p className="text-sm text-muted-foreground">
                What vendors can classify themselves as during onboarding.
              </p>
            </div>
          </div>
          {canWrite && <VendorTypeFormDialog />}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {statCards.map(({ label, count, icon: Icon, badgeClass }) => (
          <div key={label} className="stat-card">
            <div className={`icon-badge h-12 w-12 ${badgeClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="stat-card-value">{count}</p>
              <p className="stat-card-label">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <TableFilterBar
        searchPlaceholder="Search vendor types…"
        defaultSearch={search}
        statusOptions={STATUS_OPTIONS}
        defaultStatus={status}
        {...(session.scope.isGlobal ? {
          countryLabel  : "Country",
          countryOptions: countries.map((c) => ({ value: c.id, label: c.name })),
          defaultCountry: country,
        } : {})}
      />

      <VendorTypesTable result={result} page={page} search={search} status={status} country={country} />
    </div>
  )
}
