import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { FileText, Globe2 } from "lucide-react"
import { adminFetch } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { AdminPermissions } from "@repo/types/admin-app"
import { EmptyState } from "@/components/shared/EmptyState"
import { TableFilterBar } from "@/components/shared/TableFilterBar"
import { CountrySelect } from "@/components/document-types/CountrySelect"
import { DocumentTypesTable } from "@/components/document-types/DocumentTypesTable"
import { DocumentTypeFormDialog } from "@/components/document-types/DocumentTypeFormDialog"
import type { CountryLite, CountryListLite } from "@/types/vendor-type.types"
import type { DocumentTypeListResult } from "@/types/document-type.types"

export const metadata: Metadata = { title: "Document Types" }
export const revalidate = 120

const PAGE_SIZE = 20
// Used only to compute the "required"/"active" summary counts below — not
// the table itself, which fetches its own page. Document type catalogs are
// small, admin-curated lists per country, so this stays well under one page.
const STATS_PAGE_SIZE = 200

interface PageProps {
  searchParams: Promise<{ country?: string; page?: string; search?: string }>
}

export default async function DocumentTypesPage({ searchParams }: PageProps) {
  const session = await getAdminSession()

  if (!session.permissions.includes(AdminPermissions.SETTINGS_DOCUMENTS_READ)) redirect("/vendors")

  const canWrite = session.permissions.includes(AdminPermissions.SETTINGS_DOCUMENTS_WRITE)

  const countries = await adminFetch<CountryListLite>("/admin/v1/countries?status=ACTIVE&pageSize=200", {
    next: { revalidate: 300, tags: ["active-countries"] },
  }).then((r) => r.countries).catch(() => [] as CountryLite[])

  if (countries.length === 0) {
    return (
      <div className="page-content animate-slide-up">
        <div className="admin-card flex items-center gap-4">
          <div className="icon-badge icon-badge-info h-12 w-12">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Document Types</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Country-specific onboarding document requirements.</p>
          </div>
        </div>
        <EmptyState
          icon={Globe2}
          title="No active countries"
          description="Document types are managed per country — activate a country first."
        />
      </div>
    )
  }

  const { country: countrySlug, page = "1", search = "" } = await searchParams
  const selectedCountry = countries.find((c) => c.slug === countrySlug) ?? countries[0]

  const tableQs = new URLSearchParams({
    countryId: selectedCountry.id,
    page, pageSize: String(PAGE_SIZE),
    ...(search ? { search } : {}),
  })

  const [statsResult, tableResult] = await Promise.all([
    adminFetch<DocumentTypeListResult>(
      `/admin/v1/document-types?countryId=${selectedCountry.id}&page=1&pageSize=${STATS_PAGE_SIZE}`,
      { next: { revalidate: 60, tags: [`document-types-${selectedCountry.id}`] } },
    ).catch(() => null),
    adminFetch<DocumentTypeListResult>(
      `/admin/v1/document-types?${tableQs}`,
      { next: { revalidate: 60, tags: [`document-types-${selectedCountry.id}`] } },
    ).catch(() => null),
  ])

  const total    = statsResult?.total ?? 0
  const required = statsResult?.documentTypes.filter((d) => d.isRequired).length ?? 0
  const active   = statsResult?.documentTypes.filter((d) => d.status === "ACTIVE").length ?? 0

  return (
    <div className="page-content animate-slide-up">
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/vendors" className="hover:text-foreground transition-colors">Vendors</Link>
          <span>/</span>
          <span className="text-foreground">Document Types</span>
        </nav>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="icon-badge icon-badge-info h-10 w-10">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Document Types</h1>
              <p className="text-sm text-muted-foreground">
                Onboarding document requirements for {selectedCountry.name}.
              </p>
            </div>
          </div>
          {canWrite && <DocumentTypeFormDialog countryId={selectedCountry.id} />}
        </div>
      </div>

      <div className="admin-card flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <CountrySelect countries={countries} selectedSlug={selectedCountry.slug} />
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span><span className="font-medium tabular-nums text-foreground">{total}</span> total</span>
          <span><span className="font-medium tabular-nums text-foreground">{required}</span> required</span>
          <span><span className="font-medium tabular-nums text-foreground">{active}</span> active</span>
        </div>
      </div>

      <TableFilterBar
        searchPlaceholder="Search document types…"
        defaultSearch={search}
      />

      <DocumentTypesTable
        result={tableResult}
        page={page}
        countrySlug={selectedCountry.slug}
        search={search}
        canWrite={canWrite}
      />
    </div>
  )
}
