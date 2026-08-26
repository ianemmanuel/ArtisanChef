import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { PieChart } from "lucide-react"
import { adminFetch } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { AdminPermissions } from "@repo/types/admin-app"
import { getFilterableCountries } from "@/lib/countries/filterable-countries"
import { VendorCategoryCountrySelect } from "@/components/vendor-categories/VendorCategoryCountrySelect"
import { AdoptionDonutChart } from "@/components/vendor-categories/AdoptionDonutChart"
import { VendorCategoryAdoptionTable } from "@/components/vendor-categories/VendorCategoryAdoptionTable"
import type { VendorTypeAdoptionResult } from "@/types/vendor-type.types"

export const metadata: Metadata = { title: "Vendor Categories — Adoption" }
export const revalidate = 60

interface PageProps {
  searchParams: Promise<{ country?: string }>
}

/** Top 5 + an "others" bucket, derived from an already-fetched full ranking — avoids a second network call just to feed the summary donut. */
function toTopFive(data: VendorTypeAdoptionResult): VendorTypeAdoptionResult {
  const top = data.items.slice(0, 5)
  const rest = data.items.slice(5)
  const restCount = rest.reduce((sum, i) => sum + i.count, 0) + (data.others?.count ?? 0)
  return {
    total: data.total,
    items: top,
    others: restCount > 0
      ? { count: restCount, percentage: data.total > 0 ? Math.round((restCount / data.total) * 1000) / 10 : 0 }
      : null,
  }
}

/**
 * Dedicated deep-dive on category adoption — the catalog home page keeps a
 * compact top-5 preview of this same data with a "View more" link here.
 * Global scope: a top-right country picker narrows the whole page (chart +
 * table) to one country, defaulting to the system-wide aggregate. Country
 * scope: no picker — already locked to the admin's own country/countries,
 * same as every other scope-aware page in this module.
 */
export default async function VendorCategoryAdoptionPage({ searchParams }: PageProps) {
  const session = await getAdminSession()
  if (!session.permissions.includes(AdminPermissions.SETTINGS_VENDOR_TYPES_READ)) redirect("/vendors")

  const { country } = await searchParams
  const { countries, showFilter } = await getFilterableCountries(session.scope.isGlobal)

  const selectedCountry = showFilter ? countries.find((c) => c.slug === country) : undefined
  const scopeLabel = session.scope.isGlobal
    ? (selectedCountry ? selectedCountry.name : "All Countries")
    : (countries[0]?.name ?? "your country")

  const adoption = await adminFetch<VendorTypeAdoptionResult>(
    `/admin/v1/vendor-types/adoption?limit=50${selectedCountry ? `&countryId=${selectedCountry.id}` : ""}`,
    { next: { revalidate: 60, tags: ["vendor-type-adoption"] } },
  ).catch(() => ({ total: 0, items: [], others: null }) as VendorTypeAdoptionResult)

  return (
    <div className="page-content animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="icon-badge icon-badge-primary h-10 w-10">
            <PieChart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Category Adoption</h1>
            <p className="text-sm text-muted-foreground">How vendors are distributed across categories — {scopeLabel}.</p>
          </div>
        </div>
        {showFilter && (
          <VendorCategoryCountrySelect
            options={countries.map((c) => ({ slug: c.slug, name: c.name }))}
            selected={selectedCountry?.slug ?? "all"}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start">
        <AdoptionDonutChart data={toTopFive(adoption)} scopeLabel={scopeLabel} />
        <VendorCategoryAdoptionTable data={adoption} />
      </div>
    </div>
  )
}
