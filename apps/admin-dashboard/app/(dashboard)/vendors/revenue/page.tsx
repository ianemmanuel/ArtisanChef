import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, LineChart, Wallet, TrendingUp, TrendingDown } from "lucide-react"
import { adminFetch } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { getFilterableCountries } from "@/lib/countries/filterable-countries"
import { getMockVendorRevenue, getMockVendorRevenueSeries, formatMockCurrency } from "@/lib/mock/vendor-revenue"
import { RevenueAreaChart } from "@/components/countries/RevenueAreaChart"
import { RevenueCountrySelect } from "@/components/countries/RevenueCountrySelect"
import { VendorRevenueLeaderboard, type VendorRevenueEntry } from "@/components/vendors/VendorRevenueLeaderboard"
import { AdminPermissions } from "@repo/types/admin-app"
import type { VendorListResult } from "@/types"

export const metadata: Metadata = { title: "Vendor Revenue" }
export const revalidate = 300

// Large enough to rank every active vendor in scope — this feeds a
// leaderboard, not a paginated table, same convention as
// ACTIVE_COUNTRIES_PAGE_SIZE on /countries/revenue.
const ACTIVE_VENDORS_PAGE_SIZE = 500

interface PageProps {
  searchParams: Promise<{ country?: string }>
}

export default async function VendorRevenuePage({ searchParams }: PageProps) {
  const session = await getAdminSession()

  if (!session.permissions.includes(AdminPermissions.VENDORS_ACCOUNTS_READ)) redirect("/vendors")

  const { country: countryParam } = await searchParams

  const { countries: allCountries, showFilter } = await getFilterableCountries(session.scope.isGlobal)

  // Country-scoped admin: locked to their own country, same pattern as
  // /vendor-categories/adoption and /vendor-categories/revenue. Global
  // admin: "all" (aggregate) unless a specific country is selected.
  const ownCountry = !session.scope.isGlobal ? allCountries[0] : undefined
  const requested = session.scope.isGlobal && countryParam && countryParam !== "all"
    ? allCountries.find((c) => c.slug === countryParam)
    : undefined
  const selectedCountry = ownCountry ?? requested
  const selectedSlug = selectedCountry?.slug ?? "all"
  const scopeKey = selectedCountry?.slug ?? "all"
  const scopeLabel = selectedCountry?.name ?? "All countries"

  // listVendorAccounts is scope-aware server-side (see admin.vendor.service.ts)
  // — a country-scoped admin's result here is already confined to their own
  // country regardless of the countrySlug param; the param only lets a
  // global admin additionally narrow down, it can never widen access.
  const countryQs = selectedCountry ? `&countrySlug=${selectedCountry.slug}` : ""
  const result = await adminFetch<VendorListResult>(
    `/admin/v1/vendors/accounts?status=ACTIVE&pageSize=${ACTIVE_VENDORS_PAGE_SIZE}${countryQs}`,
    { next: { revalidate: 300, tags: ["vendor-accounts"] } },
  ).catch(() => null)
  const vendors = result?.accounts ?? []

  // STATIC — no Orders/Payments model exists yet, see lib/mock/vendor-revenue.ts.
  const series = getMockVendorRevenueSeries(scopeKey, 12)
  const currentMonth = series[series.length - 1]?.value ?? 0
  const priorMonth = series[series.length - 2]?.value ?? 0
  const twelveMonthTotal = series.reduce((sum, p) => sum + p.value, 0)
  const deltaPct = priorMonth > 0 ? Math.round(((currentMonth - priorMonth) / priorMonth) * 1000) / 10 : 0
  const isPositive = deltaPct >= 0

  const ranked = vendors.map((v) => {
    const mock = getMockVendorRevenue(v.id)
    return {
      id: v.id,
      name: v.legalBusinessName,
      subtitle: v.country?.name,
      value: mock.revenue,
      deltaPct: mock.deltaPct,
      href: `/vendors/accounts/${v.id}`,
    } satisfies VendorRevenueEntry
  })
  const topVendors = [...ranked].sort((a, b) => b.value - a.value).slice(0, 10)
  const needsAttention = ranked.filter((e) => e.deltaPct < 0).sort((a, b) => a.deltaPct - b.deltaPct).slice(0, 5)

  return (
    <div className="page-content animate-slide-up">
      <Link
        href="/vendors"
        className="group inline-flex w-fit items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card shadow-[var(--shadow-xs)] transition-all group-hover:-translate-x-0.5 group-hover:border-primary/40 group-hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
        </span>
        Back to Vendors
      </Link>

      <div className="admin-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="icon-badge icon-badge-primary h-12 w-12">
            <LineChart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Revenue</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Vendor performance — {scopeLabel}. Illustrative figures, see note below the chart.
            </p>
          </div>
        </div>
        {showFilter && (
          <RevenueCountrySelect
            options={allCountries.map((c) => ({ slug: c.slug, name: c.name }))}
            selected={selectedSlug}
            locked={false}
          />
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <div className="icon-badge icon-badge-primary h-12 w-12">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="stat-card-value">{formatMockCurrency(currentMonth)}</p>
            <p className="stat-card-label">This Month</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="icon-badge icon-badge-info h-12 w-12">
            <LineChart className="h-5 w-5" />
          </div>
          <div>
            <p className="stat-card-value">{formatMockCurrency(twelveMonthTotal)}</p>
            <p className="stat-card-label">12-Month Total</p>
          </div>
        </div>
        <div className="stat-card">
          <div className={`icon-badge h-12 w-12 ${isPositive ? "icon-badge-success" : "icon-badge-danger"}`}>
            {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          </div>
          <div>
            <p className="stat-card-value">{isPositive ? "+" : ""}{deltaPct}%</p>
            <p className="stat-card-label">vs Prior Month</p>
          </div>
        </div>
      </div>

      <RevenueAreaChart data={series} label={scopeLabel} />

      <div className="grid gap-4 lg:grid-cols-2">
        <VendorRevenueLeaderboard
          title="Top Vendors by Revenue"
          description="Highest-earning vendors, across all their outlets."
          icon={TrendingUp}
          badgeClass="icon-badge-success"
          entries={topVendors}
          emptyTitle="No active vendors"
          emptyDescription="Revenue only tracks vendors that are currently active."
        />
        <VendorRevenueLeaderboard
          title="Needs Attention"
          description="Active vendors trending down quarter-over-quarter."
          icon={TrendingDown}
          badgeClass="icon-badge-danger"
          entries={needsAttention}
          emptyTitle="No vendors in the red"
          emptyDescription="Every active vendor grew (or held flat) last quarter."
        />
      </div>
    </div>
  )
}
