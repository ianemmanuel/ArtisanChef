import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, TrendingUp, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react"
import { adminFetch, ApiCallError } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { AdminPermissions } from "@repo/types/admin-app"
import { VendorTypeRevenueChart } from "@/components/vendor-types/VendorTypeRevenueChart"
import { getMockVendorTypeRevenueSeries } from "@/lib/mock/vendor-type-revenue"
import { formatMockCurrency } from "@/lib/mock/country-revenue"
import type { VendorType } from "@/types/vendor-type.types"

export const metadata: Metadata = { title: "Vendor Type — Revenue" }

interface Props { params: Promise<{ id: string }> }

export default async function VendorTypeRevenuePage({ params }: Props) {
  const { id } = await params
  const session = await getAdminSession()

  if (!session.permissions.includes(AdminPermissions.SETTINGS_VENDOR_TYPES_READ)) redirect("/vendors")

  let vendorType: VendorType
  try {
    vendorType = await adminFetch<VendorType>(`/admin/v1/vendor-types/${id}`, {
      next: { revalidate: 60, tags: [`vendor-type-${id}`] },
    })
  } catch (err) {
    if (err instanceof ApiCallError && err.status === 404) notFound()
    throw err
  }

  // STATIC — no Orders/Payments model exists yet, see lib/mock/vendor-type-revenue.ts.
  const points = getMockVendorTypeRevenueSeries(id, 12)

  const currentMonth = points[points.length - 1]?.value ?? 0
  const total12Month = points.reduce((sum, p) => sum + p.value, 0)
  const firstMonth    = points[0]?.value ?? 0
  const deltaPct      = firstMonth > 0 ? Math.round(((currentMonth - firstMonth) / firstMonth) * 1000) / 10 : 0
  const isPositive    = deltaPct >= 0

  return (
    <div className="page-content animate-slide-up">

      <Link
        href={`/vendors/vendor-types/${id}`}
        className="group inline-flex w-fit items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card shadow-[var(--shadow-xs)] transition-all group-hover:-translate-x-0.5 group-hover:border-primary/40 group-hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
        </span>
        Back to {vendorType.name}
      </Link>

      <div className="flex items-center gap-3">
        <div className="icon-badge icon-badge-primary h-10 w-10">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {vendorType.name} — Revenue Trend
          </h1>
          <p className="text-sm text-muted-foreground">Illustrative monthly revenue over the last 12 months.</p>
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

      <VendorTypeRevenueChart points={points} />
    </div>
  )
}
