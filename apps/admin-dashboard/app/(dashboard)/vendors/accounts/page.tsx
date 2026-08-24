import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Building2, ShieldAlert, CheckCircle, Ban } from "lucide-react"
import { adminFetch } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { TableFilterBar, type FilterStatusOption } from "@/components/shared/TableFilterBar"
import { VendorAccountsTable } from "@/components/vendors/VendorAccountsTable"
import { AdminPermissions } from "@repo/types/admin-app"
import type { VendorListResult } from "@/types"

export const metadata: Metadata = { title: "Vendor Accounts" }
export const revalidate = 60

const PAGE_SIZE = 20

const STATUS_OPTIONS: FilterStatusOption[] = [
  { value: "ACTIVE",    label: "Active",    dot: "bg-success" },
  { value: "SUSPENDED", label: "Suspended", dot: "bg-warning" },
  { value: "BANNED",    label: "Banned",    dot: "bg-destructive" },
]

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>
}

export default async function VendorAccountsPage({ searchParams }: PageProps) {
  const session = await getAdminSession()

  if (!session.permissions.includes(AdminPermissions.VENDORS_ACCOUNTS_READ)) redirect("/vendors")

  const params   = await searchParams
  const page     = params.page   ?? "1"
  const search   = params.search ?? ""
  const status   = params.status ?? ""

  // BANNED is identity-level (VendorUser.isBanned), not a VendorAccount
  // status — VendorStatus only has ACTIVE/SUSPENDED (see admin.vendor.service.ts).
  // The status dropdown still offers "Banned" as an option; translate it to
  // bannedOnly rather than passing an invalid status value straight through.
  const isBannedFilter = status === "BANNED"
  const qs = new URLSearchParams({
    page, pageSize: String(PAGE_SIZE),
    ...(search ? { search }  : {}),
    ...(isBannedFilter ? { bannedOnly: "true" } : status && status !== "all" ? { status } : {}),
  })

  const [result, active, suspended, banned] = await Promise.all([
    adminFetch<VendorListResult>(`/admin/v1/vendors/accounts?${qs}`, {
      next: { revalidate: 60, tags: ["vendor-accounts"] },
    }).catch(() => null),
    adminFetch<VendorListResult>(`/admin/v1/vendors/accounts?status=ACTIVE&pageSize=1`, {
      next: { revalidate: 60 },
    }).catch(() => null),
    adminFetch<VendorListResult>(`/admin/v1/vendors/accounts?status=SUSPENDED&pageSize=1`, {
      next: { revalidate: 60 },
    }).catch(() => null),
    adminFetch<VendorListResult>(`/admin/v1/vendors/accounts?bannedOnly=true&pageSize=1`, {
      next: { revalidate: 60 },
    }).catch(() => null),
  ])

  const statusCards = [
    { s: "",          label: "Total",     icon: Building2,   count: result?.total ?? 0,    badgeClass: "icon-badge-primary" },
    { s: "ACTIVE",    label: "Active",    icon: CheckCircle, count: active?.total ?? 0,    badgeClass: "icon-badge-success" },
    { s: "SUSPENDED", label: "Suspended", icon: ShieldAlert, count: suspended?.total ?? 0, badgeClass: "icon-badge-warning" },
    { s: "BANNED",    label: "Banned",    icon: Ban,         count: banned?.total ?? 0,    badgeClass: "icon-badge-danger" },
  ]

  return (
    <div className="page-content animate-slide-up">
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/vendors" className="hover:text-foreground transition-colors">Vendors</Link>
          <span>/</span>
          <span className="text-foreground">Accounts</span>
        </nav>
        <div className="mt-2 flex items-center gap-3">
          <div className="icon-badge icon-badge-primary h-10 w-10">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Vendor Accounts</h1>
            <p className="text-sm text-muted-foreground">Active vendor accounts on the platform.</p>
          </div>
        </div>
      </div>

      {/* Status overview */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statusCards.map(({ s, label, icon: Icon, count, badgeClass }) => (
          <Link key={label}
            href={s ? `/vendors/accounts?status=${s}` : "/vendors/accounts"}
            className={["stat-card", status === s ? "border-primary/50" : ""].join(" ")}>
            <div className={`icon-badge h-12 w-12 ${badgeClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="stat-card-value">{count}</p>
              <p className="stat-card-label">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Filters */}
      <TableFilterBar
        searchPlaceholder="Search business or email…"
        defaultSearch={search}
        statusOptions={STATUS_OPTIONS}
        defaultStatus={status}
      />

      {/* Table */}
      <VendorAccountsTable result={result} page={page} search={search} status={status} />
    </div>
  )
}
