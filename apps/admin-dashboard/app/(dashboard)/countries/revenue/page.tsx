import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, LineChart, Wallet, TrendingUp, TrendingDown } from "lucide-react"
import { adminFetch } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { getScopeTier } from "@/lib/auth/scope-tier"
import { getMockRevenueSeries, formatMockCurrency } from "@/lib/mock/country-revenue"
import { RevenueAreaChart } from "@/components/countries/RevenueAreaChart"
import { RevenueCountrySelect } from "@/components/countries/RevenueCountrySelect"
import { AdminPermissions } from "@repo/types/admin-app"
import type { CountryListResult } from "@repo/types/admin-app"

export const metadata: Metadata = { title: "Revenue" }
export const revalidate = 300

// Large enough to capture every active country in scope for the selector —
// this populates a dropdown, not a paginated table.
const ACTIVE_COUNTRIES_PAGE_SIZE = 200

interface PageProps {
  searchParams: Promise<{ country?: string }>
}

export default async function CountryRevenuePage({ searchParams }: PageProps) {
  const session = await getAdminSession()

  if (!session.permissions.includes(AdminPermissions.SETTINGS_GEOGRAPHY_READ)) redirect("/overview")
  const tier = getScopeTier(session)
  if (tier === "CITY") redirect("/cities")

  const { country: countryParam } = await searchParams

  const activeResult = await adminFetch<CountryListResult>(`/admin/v1/countries?status=ACTIVE&pageSize=${ACTIVE_COUNTRIES_PAGE_SIZE}`, {
    next: { revalidate: 300, tags: ["countries"] },
  }).catch(() => null)

  const activeCountries = activeResult?.countries ?? []
  const isGlobalTier     = tier === "GLOBAL"
  const options           = activeCountries.map((c) => ({ slug: c.slug, name: c.name }))

  let selectedSlug = "all"
  let key           = "all"
  let label         = "All active countries"

  if (isGlobalTier) {
    const requested = countryParam && countryParam !== "all"
      ? activeCountries.find((c) => c.slug === countryParam)
      : undefined
    if (requested) {
      selectedSlug = requested.slug
      key = requested.slug
      label = requested.name
    }
  } else {
    // COUNTRY-tier — the countries endpoint is already scope-filtered
    // server-side, so the first (and typically only) active country here
    // is theirs. Nothing to actually pick, but the selector still renders,
    // locked, for a consistent control surface across tiers.
    const own = activeCountries[0]
    selectedSlug = own?.slug ?? "all"
    key = own?.slug ?? "all"
    label = own?.name ?? "Your country"
  }

  // STATIC — no Orders/Payments model exists yet, see lib/mock/country-revenue.ts.
  const series = getMockRevenueSeries(key, 12)

  const currentMonth     = series[series.length - 1]?.value ?? 0
  const priorMonth       = series[series.length - 2]?.value ?? 0
  const twelveMonthTotal = series.reduce((sum, p) => sum + p.value, 0)
  const deltaPct         = priorMonth > 0 ? Math.round(((currentMonth - priorMonth) / priorMonth) * 1000) / 10 : 0
  const isPositive       = deltaPct >= 0

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

      <div className="admin-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="icon-badge icon-badge-primary h-12 w-12">
            <LineChart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Revenue</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              12-month trend — illustrative figures, see note below the chart.
            </p>
          </div>
        </div>
        <RevenueCountrySelect options={options} selected={selectedSlug} locked={!isGlobalTier} />
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

      <RevenueAreaChart data={series} label={label} />
    </div>
  )
}
