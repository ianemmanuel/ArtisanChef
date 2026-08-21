import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Flag, TrendingUp, TrendingDown, Settings2 } from "lucide-react"
import { adminFetch } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { getScopeTier } from "@/lib/auth/scope-tier"
import { getMockCountryRevenue, getMockRevenueSeries } from "@/lib/mock/country-revenue"
import { CountriesTable } from "@/components/countries/CountriesTable"
import { RevenueAreaChart } from "@/components/countries/RevenueAreaChart"
import { SectionViewMoreHeader } from "@/components/countries/SectionViewMoreHeader"
import { RevenueRankedList } from "@/components/countries/RevenueRankedList"
import { RevenueStatCard } from "@/components/countries/RevenueStatCard"
import { OnboardingLeaderboard } from "@/components/countries/OnboardingLeaderboard"
import { TableFilterBar } from "@/components/shared/TableFilterBar"
import { AdminPermissions } from "@repo/types/admin-app"
import type { CountrySummaryResult, CountryListResult, CountryOnboardingLeaderboardEntry } from "@repo/types/admin-app"

export const metadata: Metadata = { title: "Countries" }
export const revalidate = 300

const PAGE_SIZE = 10
// Large enough to capture every active country in scope for the revenue
// ranked lists below — this is a ranking/aggregation read, not the
// paginated table, so it intentionally doesn't use PAGE_SIZE.
const ACTIVE_COUNTRIES_PAGE_SIZE = 200

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string }>
}

export default async function CountriesPage({ searchParams }: PageProps) {
  const session = await getAdminSession()

  if (!session.permissions.includes(AdminPermissions.SETTINGS_GEOGRAPHY_READ)) redirect("/overview")
  const tier = getScopeTier(session)
  if (tier === "CITY") redirect("/cities")

  const { page = "1", search = "" } = await searchParams

  const tableQuery = new URLSearchParams({ page, pageSize: String(PAGE_SIZE) })
  if (search) tableQuery.set("search", search)

  const [activeResult, tableResult, onboarding] = await Promise.all([
    adminFetch<CountryListResult>(`/admin/v1/countries?status=ACTIVE&pageSize=${ACTIVE_COUNTRIES_PAGE_SIZE}`, {
      next: { revalidate: 300, tags: ["countries"] },
    }).catch(() => null),
    adminFetch<CountryListResult>(`/admin/v1/countries?${tableQuery.toString()}`, {
      next: { revalidate: 300, tags: ["countries"] },
    }).catch(() => null),
    adminFetch<CountryOnboardingLeaderboardEntry[]>("/admin/v1/countries/insights/onboarding", {
      next: { revalidate: 300, tags: ["countries-onboarding-insights"] },
    }).catch(() => [] as CountryOnboardingLeaderboardEntry[]),
  ])

  const activeCountries: CountrySummaryResult[] = activeResult?.countries ?? []
  const tableCountries                          = tableResult?.countries ?? []

  // STATIC revenue figures — see lib/mock/country-revenue.ts.
  const revenueEntries = activeCountries.map((c) => {
    const mock = getMockCountryRevenue(c.slug)
    return { slug: c.slug, name: c.name, revenue: mock.revenue, deltaPct: mock.deltaPct }
  })
  const rankedEntries = revenueEntries.map((e) => ({ slug: e.slug, name: e.name, value: e.revenue, deltaPct: e.deltaPct }))
  const topRevenue = [...rankedEntries].sort((a, b) => b.value - a.value).slice(0, 5)
  const losses = rankedEntries.filter((e) => e.deltaPct < 0).sort((a, b) => a.deltaPct - b.deltaPct).slice(0, 5)

  const isGlobalTier = tier === "GLOBAL"
  const ownCountry    = activeCountries[0]
  // STATIC — no Orders/Payments model exists yet, see lib/mock/country-revenue.ts.
  // "all" aggregates across every active country in scope; a COUNTRY-tier
  // admin instead sees just their own country's trend.
  const revenueSeriesKey = isGlobalTier ? "all" : (ownCountry?.slug ?? "all")
  const revenueSeries    = getMockRevenueSeries(revenueSeriesKey, 12)
  const revenueLabel     = isGlobalTier ? "All active countries" : (ownCountry?.name ?? "Your country")

  const canWrite = session.permissions.includes(AdminPermissions.SETTINGS_GEOGRAPHY_WRITE)
  const isGlobal = session.scope.isGlobal

  return (
    <div className="page-content animate-slide-up">
      <div className="admin-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="icon-badge icon-badge-primary h-12 w-12">
            <Flag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Countries</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Platform footprint — revenue, onboarding, and activation at a glance.
            </p>
          </div>
        </div>
        {isGlobal && canWrite && (
          <Link href="/countries/activation" className="view-all-link">
            <Settings2 className="h-3.5 w-3.5" />
            Manage activation →
          </Link>
        )}
      </div>

      <div className="space-y-3">
        <SectionViewMoreHeader title="Revenue" href="/countries/revenue" linkLabel="See more" />
        <RevenueAreaChart data={revenueSeries} label={revenueLabel} />
      </div>

      {isGlobalTier ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <RevenueRankedList
              title="Top Revenue — Last Quarter"
              description="Highest-earning active countries."
              icon={TrendingUp}
              badgeClass="icon-badge-success"
              entries={topRevenue}
              emptyTitle="No active countries"
              emptyDescription="Revenue only tracks countries that are currently active."
            />
            <RevenueRankedList
              title="Countries With Losses — Last Quarter"
              description="Active countries trending down quarter-over-quarter."
              icon={TrendingDown}
              badgeClass="icon-badge-danger"
              entries={losses}
              emptyTitle="No countries in the red"
              emptyDescription="Every active country grew (or held flat) last quarter."
            />
          </div>

          <OnboardingLeaderboard entries={onboarding} quarterLabel="this quarter" />
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ownCountry && (
            <RevenueStatCard revenue={getMockCountryRevenue(ownCountry.slug)} />
          )}
          <div className="stat-card">
            <div className="icon-badge icon-badge-info h-12 w-12">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="stat-card-value">{onboarding[0]?.count.toLocaleString() ?? 0}</p>
              <p className="stat-card-label">Vendor Onboarding — this quarter</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">All Countries</h2>
        </div>
        <TableFilterBar showSearch searchPlaceholder="Search countries…" defaultSearch={search} />
        <CountriesTable
          countries={tableCountries}
          readOnly
          pagination={{
            total: tableResult?.total ?? 0,
            page,
            totalPages: tableResult?.totalPages ?? 1,
            basePath: "/countries",
            params: search ? { search } : {},
          }}
        />
      </div>
    </div>
  )
}
