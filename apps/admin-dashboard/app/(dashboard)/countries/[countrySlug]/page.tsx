import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Flag, Building2, Store, Coins, Globe2 } from "lucide-react"
import { adminFetch, ApiCallError } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { getScopeTier } from "@/lib/auth/scope-tier"
import { getMockCountryRevenue } from "@/lib/mock/country-revenue"
import { CountryActions } from "@/components/countries/CountryActions"
import { SectionViewMoreHeader } from "@/components/countries/SectionViewMoreHeader"
import { VendorSnapshotSummary } from "@/components/countries/VendorSnapshotSummary"
import { RevenueStatCard } from "@/components/countries/RevenueStatCard"
import { CountryCitiesPreview, type CityPreviewEntry } from "@/components/countries/CountryCitiesPreview"
import { DocumentTypePreviewList } from "@/components/document-types/DocumentTypePreviewList"
import { AdminPermissions } from "@repo/types/admin-app"
import type { Country, CountryVendorSnapshot, CityOutletLeaderboardEntry } from "@repo/types/admin-app"
import type { DocumentTypeConfig } from "@/types/document-type.types"

export const revalidate = 60

interface Props { params: Promise<{ countrySlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { countrySlug } = await params
  return { title: countrySlug }
}

function StatusBadge({ status }: { status: string }) {
  return status === "ACTIVE"
    ? <span className="badge-success">Active</span>
    : <span className="badge-neutral">Inactive</span>
}

interface DocumentTypeListResult {
  documentTypes: DocumentTypeConfig[]
  total: number
}

export default async function CountryDetailPage({ params }: Props) {
  const session = await getAdminSession()

  if (!session.permissions.includes(AdminPermissions.SETTINGS_GEOGRAPHY_READ)) redirect("/overview")
  // City-scoped admins have no country-level rollup to see at all.
  if (getScopeTier(session) === "CITY") redirect("/cities")

  const { countrySlug } = await params

  let country: Country
  try {
    country = await adminFetch<Country>(`/admin/v1/countries/${countrySlug}`, {
      next: { revalidate: 60, tags: [`country-${countrySlug}`] },
    })
  } catch (err) {
    if (err instanceof ApiCallError && err.status === 404) notFound()
    throw err
  }

  const [vendorSnapshot, cityLeaderboard, docTypesPreview] = await Promise.all([
    adminFetch<CountryVendorSnapshot>(`/admin/v1/countries/${countrySlug}/vendors`, {
      next: { revalidate: 60, tags: [`country-${countrySlug}-vendors`] },
    }).catch(() => null),
    adminFetch<CityOutletLeaderboardEntry[]>(`/admin/v1/countries/${countrySlug}/cities/leaderboard`, {
      next: { revalidate: 60, tags: [`country-${countrySlug}-cities-leaderboard`] },
    }).catch(() => [] as CityOutletLeaderboardEntry[]),
    adminFetch<DocumentTypeListResult>(`/admin/v1/document-types?countryId=${country.id}&pageSize=5`, {
      next: { revalidate: 60, tags: [`document-types-${country.id}`] },
    }).catch(() => null),
  ])

  const canWrite = session.permissions.includes(AdminPermissions.SETTINGS_GEOGRAPHY_WRITE)

  const cityPreviewEntries: CityPreviewEntry[] = cityLeaderboard.length > 0
    ? cityLeaderboard.slice(0, 6).map((c) => ({ name: c.name, count: c.count }))
    : country.cities.slice(0, 6).map((c) => ({ name: c.name, count: null }))

  return (
    <div className="page-content animate-slide-up">

      <Link
        href="/countries"
        className="group inline-flex w-fit items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card shadow-[var(--shadow-xs)] transition-all group-hover:-translate-x-0.5 group-hover:border-primary/40 group-hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
        </span>
        Back to Countries
      </Link>

      {/* Hero */}
      <div className="admin-card flex flex-wrap items-center gap-4">
        <div className="icon-badge icon-badge-primary h-14 w-14 shrink-0">
          <Flag className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-semibold text-foreground">{country.name}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Globe2 className="h-3.5 w-3.5" />{country.code} · {country.phoneCode}</span>
            <span className="inline-flex items-center gap-1"><Coins className="h-3.5 w-3.5" />{country.currency}{country.currencySymbol ? ` (${country.currencySymbol})` : ""}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <StatusBadge status={country.status} />
          <CountryActions
            countrySlug={country.slug}
            countryName={country.name}
            status={country.status}
            canWrite={canWrite}
            isGlobal={session.scope.isGlobal}
            size="default"
          />
        </div>
      </div>

      {/* Headline stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <div className="icon-badge icon-badge-primary h-12 w-12">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="stat-card-value">{country._count?.cities ?? country.cities.length}</p>
            <p className="stat-card-label">Cities</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="icon-badge icon-badge-success h-12 w-12">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <p className="stat-card-value">{country._count?.vendors ?? 0}</p>
            <p className="stat-card-label">Vendors</p>
          </div>
        </div>
        <RevenueStatCard revenue={getMockCountryRevenue(country.slug)} />
      </div>

      {/* Vendor onboarding */}
      <div className="space-y-3">
        <SectionViewMoreHeader title="Vendor Onboarding" href={`/vendors/applications?countryId=${country.id}`} />
        <VendorSnapshotSummary snapshot={vendorSnapshot} />
      </div>

      {/* Cities */}
      <div className="space-y-3">
        <SectionViewMoreHeader title="Cities" href={`/cities?country=${country.slug}`} />
        <CountryCitiesPreview entries={cityPreviewEntries} />
      </div>

      {/* Document types */}
      <div className="space-y-3">
        <SectionViewMoreHeader title="Document Types" href={`/vendors/document-types?country=${country.slug}`} />
        <DocumentTypePreviewList
          documentTypes={docTypesPreview?.documentTypes ?? []}
          total={docTypesPreview?.total ?? 0}
        />
      </div>

    </div>
  )
}
