import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Tag, Building2, CheckCircle2, Ban, TrendingUp, ArrowUpRight, ArrowDownRight, Store } from "lucide-react"
import { adminFetch, ApiCallError } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { AdminPermissions } from "@repo/types/admin-app"
import { VendorTypeStatusBadge } from "@/components/vendor-types/VendorTypeStatusBadge"
import { VendorTypeStatusAction } from "@/components/vendor-types/VendorTypeStatusAction"
import { VendorTypeFormDialog } from "@/components/vendor-types/VendorTypeFormDialog"
import { VendorTypeCountryManager } from "@/components/vendor-types/VendorTypeCountryManager"
import { SectionViewMoreHeader } from "@/components/countries/SectionViewMoreHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { getInitials } from "@/lib/initials"
import { getMockVendorTypeRevenue } from "@/lib/mock/vendor-type-revenue"
import { formatMockCurrency } from "@/lib/mock/country-revenue"
import type { VendorTypeDetail, VendorTypeStats, CountryListLite, CountryLite } from "@/types/vendor-type.types"
import type { VendorListResult } from "@/types"

export const metadata: Metadata = { title: "Vendor Type" }

interface Props { params: Promise<{ id: string }> }

function VendorStatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    ACTIVE   : "badge-success",
    SUSPENDED: "badge-warning",
    BANNED   : "badge-danger",
  }
  const label: Record<string, string> = {
    ACTIVE   : "Active",
    SUSPENDED: "Suspended",
    BANNED   : "Banned",
  }
  return <span className={cls[status] ?? "badge-neutral"}>{label[status] ?? status}</span>
}

export default async function VendorTypeDetailPage({ params }: Props) {
  const { id } = await params
  const session = await getAdminSession()

  if (!session.permissions.includes(AdminPermissions.SETTINGS_VENDOR_TYPES_READ)) redirect("/vendors")

  const canWrite = session.scope.isGlobal
    && session.permissions.includes(AdminPermissions.SETTINGS_VENDOR_TYPES_WRITE)

  let vendorType: VendorTypeDetail
  try {
    vendorType = await adminFetch<VendorTypeDetail>(`/admin/v1/vendor-types/${id}`, {
      next: { revalidate: 60, tags: [`vendor-type-${id}`] },
    })
  } catch (err) {
    if (err instanceof ApiCallError && err.status === 404) notFound()
    throw err
  }

  const [allCountries, stats, vendorsPreview] = await Promise.all([
    canWrite
      ? adminFetch<CountryListLite>("/admin/v1/countries?status=ACTIVE&pageSize=200", {
          next: { revalidate: 120 },
        }).then((r) => r.countries).catch(() => [] as CountryLite[])
      : Promise.resolve([] as CountryLite[]),
    adminFetch<VendorTypeStats>(`/admin/v1/vendor-types/${id}/stats`, {
      next: { revalidate: 60, tags: [`vendor-type-${id}-stats`] },
    }).catch(() => null),
    adminFetch<VendorListResult>(`/admin/v1/vendors/accounts?vendorTypeId=${id}&pageSize=5`, {
      next: { revalidate: 60, tags: [`vendor-type-${id}-vendors`] },
    }).catch(() => null),
  ])

  // STATIC — no Orders/Payments model exists yet, see lib/mock/vendor-type-revenue.ts.
  const revenue = getMockVendorTypeRevenue(vendorType.id)
  const revenuePositive = revenue.deltaPct >= 0

  return (
    <div className="page-content animate-slide-up">

      <Link
        href="/vendors/vendor-types"
        className="group inline-flex w-fit items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card shadow-[var(--shadow-xs)] transition-all group-hover:-translate-x-0.5 group-hover:border-primary/40 group-hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
        </span>
        Back to Vendor Types
      </Link>

      <div className="admin-card flex items-center gap-4">
        <div className="icon-badge icon-badge-primary h-14 w-14 shrink-0">
          <Tag className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-semibold text-foreground">{vendorType.name}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {vendorType.description || "No description"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <VendorTypeStatusBadge status={vendorType.status} />
          {canWrite && (
            <>
              <VendorTypeFormDialog vendorType={vendorType} />
              <VendorTypeStatusAction id={vendorType.id} name={vendorType.name} status={vendorType.status} />
            </>
          )}
        </div>
      </div>

      {/* Headline stats — real vendor-account counts + illustrative revenue */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card">
          <div className="icon-badge icon-badge-primary h-12 w-12">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="stat-card-value">{stats?.total ?? 0}</p>
            <p className="stat-card-label">Vendor Accounts</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="icon-badge icon-badge-success h-12 w-12">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="stat-card-value">{stats?.active ?? 0}</p>
            <p className="stat-card-label">Active</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="icon-badge icon-badge-warning h-12 w-12">
            <Ban className="h-5 w-5" />
          </div>
          <div>
            <p className="stat-card-value">{stats?.suspended ?? 0}</p>
            <p className="stat-card-label">Suspended</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="icon-badge icon-badge-info h-12 w-12">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="stat-card-value">{formatMockCurrency(revenue.revenue)}</p>
            <p className="stat-card-label">Revenue — Last Quarter</p>
            <p className={`mt-1 inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${revenuePositive ? "text-success" : "text-destructive"}`}>
              {revenuePositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(revenue.deltaPct)}% vs prior quarter
            </p>
          </div>
        </div>
      </div>
      <p className="-mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Revenue is illustrative — replace once Orders/Payments ships.</span>
        <Link href={`/vendors/vendor-types/${vendorType.id}/revenue`} className="view-all-link">
          View revenue trend →
        </Link>
      </p>

      <VendorTypeCountryManager
        vendorTypeId={vendorType.id}
        countries={vendorType.countries}
        allCountries={allCountries}
        canWrite={canWrite}
      />

      {/* Vendor accounts preview */}
      <div className="admin-card space-y-4">
        <SectionViewMoreHeader
          title="Vendor Accounts"
          href={`/vendors/vendor-types/${vendorType.id}/vendors`}
        />

        {!vendorsPreview || vendorsPreview.accounts.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No vendor accounts yet"
            description="Vendors that select this type during onboarding will show up here."
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {vendorsPreview.accounts.map((acc) => (
              <li key={acc.id}>
                <Link href={`/vendors/accounts/${acc.id}`} className="group flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="avatar-circle h-9 w-9 text-xs">
                      {getInitials(acc.legalBusinessName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                        {acc.legalBusinessName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{acc.country?.name ?? "—"}</p>
                    </div>
                  </div>
                  <VendorStatusBadge status={acc.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
