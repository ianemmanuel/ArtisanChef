import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, TrendingUp, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react"
import { adminFetch } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { AdminPermissions } from "@repo/types/admin-app"
import { VendorCategorySelect } from "@/components/vendor-categories/VendorCategorySelect"
import { VendorCategoryCountrySelect } from "@/components/vendor-categories/VendorCategoryCountrySelect"
import { VendorCategoryRevenueChart } from "@/components/vendor-categories/VendorCategoryRevenueChart"
import { VendorCategoryRevenueByCountryTable } from "@/components/vendor-categories/VendorCategoryRevenueByCountryTable"
import { getFilterableCountries } from "@/lib/countries/filterable-countries"
import { getMockVendorTypeRevenueSeries, getMockVendorTypeRevenueByCountry } from "@/lib/mock/vendor-type-revenue"
import { formatMockCurrency } from "@/lib/mock/country-revenue"
import type { VendorTypeListResult } from "@/types/vendor-type.types"

export const metadata: Metadata = { title: "Vendor Categories — Revenue" }
export const revalidate = 60

interface PageProps {
  searchParams: Promise<{ type?: string; country?: string }>
}

/**
 * Single shared revenue page for every category — a dropdown selects
 * which one, rather than a separate /vendor-categories/[slug]/revenue
 * route per category (that would duplicate this exact UI once per
 * category for no benefit). Linked from both the catalog page's revenue
 * donut ("View revenue trend") and each category's detail page, both
 * pre-selecting ?type=<slug>.
 *
 * Global scope: a second top-right picker narrows by country too —
 * default "All Countries" aggregates the selected category's revenue
 * across every country (historical, so it isn't limited to currently-
 * active countries) and shows a paginated country-ranking table; picking
 * one country narrows the chart to it and hides the table (ranking one
 * country against itself has nothing to show). Country scope: no picker
 * at all — the chart is fixed to the admin's own country and the table
 * is omitted outright, same reasoning.
 */
export default async function VendorCategoriesRevenuePage({ searchParams }: PageProps) {
  const session = await getAdminSession()
  if (!session.permissions.includes(AdminPermissions.SETTINGS_VENDOR_TYPES_READ)) redirect("/vendors")

  const { type, country } = await searchParams

  const [vendorTypes, { countries, showFilter: showCountryFilter }] = await Promise.all([
    adminFetch<VendorTypeListResult>(`/admin/v1/vendor-types?status=ACTIVE&pageSize=200`, {
      next: { revalidate: 300, tags: ["vendor-types"] },
    }).then((r) => r.vendorTypes).catch(() => []),
    getFilterableCountries(session.scope.isGlobal),
  ])

  if (vendorTypes.length === 0) {
    redirect("/vendor-categories")
  }

  const selected = vendorTypes.find((vt) => vt.slug === type) ?? vendorTypes[0]!

  // Country-scoped admin: their own country stands in for the chart's
  // scope key (same simplification as the catalog/adoption pages — first
  // country if they somehow hold more than one COUNTRY scope row). Global
  // admin: the top-right picker, defaulting to the system-wide aggregate.
  const selectedCountry = showCountryFilter ? countries.find((c) => c.slug === country) : undefined
  const ownCountry = !session.scope.isGlobal ? countries[0] : undefined
  const scopeKey   = session.scope.isGlobal ? (selectedCountry?.slug ?? "all") : (ownCountry?.slug ?? "all")
  const scopeLabel = session.scope.isGlobal
    ? (selectedCountry ? `in ${selectedCountry.name}` : "across all countries")
    : `in ${ownCountry?.name ?? "your country"}`

  const points = getMockVendorTypeRevenueSeries(selected.id, 12, scopeKey)
  const currentMonth = points[points.length - 1]?.value ?? 0
  const total12Month = points.reduce((sum, p) => sum + p.value, 0)
  const firstMonth    = points[0]?.value ?? 0
  const deltaPct      = firstMonth > 0 ? Math.round(((currentMonth - firstMonth) / firstMonth) * 1000) / 10 : 0
  const isPositive    = deltaPct >= 0

  // Ranking-by-country only makes sense when the chart itself is showing
  // the all-countries aggregate — once a single country is selected above,
  // there's nothing left to rank it against.
  const showCountryRanking = session.scope.isGlobal && !selectedCountry
  const countryRanking = showCountryRanking
    ? getMockVendorTypeRevenueByCountry(selected.id, countries.map((c) => ({ slug: c.slug, name: c.name })))
    : []

  return (
    <div className="page-content animate-slide-up">

      <Link
        href="/vendor-categories"
        className="group inline-flex w-fit items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card shadow-[var(--shadow-xs)] transition-all group-hover:-translate-x-0.5 group-hover:border-primary/40 group-hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
        </span>
        Back to Vendor Categories
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="icon-badge icon-badge-primary h-10 w-10">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Category Revenue
            </h1>
            <p className="text-sm text-muted-foreground">Illustrative monthly revenue over the last 12 months.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showCountryFilter && (
            <VendorCategoryCountrySelect
              options={countries.map((c) => ({ slug: c.slug, name: c.name }))}
              selected={selectedCountry?.slug ?? "all"}
            />
          )}
          <VendorCategorySelect options={vendorTypes.map((vt) => ({ slug: vt.slug, name: vt.name }))} selected={selected.slug} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <div className="icon-badge icon-badge-primary h-12 w-12">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="stat-card-value">{formatMockCurrency(currentMonth)}</p>
            <p className="stat-card-label">Current Month</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="icon-badge icon-badge-info h-12 w-12">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="stat-card-value">{formatMockCurrency(total12Month)}</p>
            <p className="stat-card-label">12-Month Total</p>
          </div>
        </div>
        <div className="stat-card">
          <div className={`icon-badge h-12 w-12 ${isPositive ? "icon-badge-success" : "icon-badge-danger"}`}>
            {isPositive ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
          </div>
          <div>
            <p className={`stat-card-value ${isPositive ? "text-success" : "text-destructive"}`}>
              {isPositive ? "+" : ""}{deltaPct}%
            </p>
            <p className="stat-card-label">vs 12 Months Ago</p>
          </div>
        </div>
      </div>

      <VendorCategoryRevenueChart points={points} scopeLabel={`${selected.name} ${scopeLabel}`} />

      {showCountryRanking && <VendorCategoryRevenueByCountryTable rows={countryRanking} />}
    </div>
  )
}
