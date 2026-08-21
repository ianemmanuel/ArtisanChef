import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Store } from "lucide-react"
import { adminFetch, ApiCallError } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { AdminPermissions } from "@repo/types/admin-app"
import { TableFilterBar, type FilterStatusOption } from "@/components/shared/TableFilterBar"
import { VendorTypeVendorAccountsTable } from "@/components/vendor-types/VendorTypeVendorAccountsTable"
import type { VendorType } from "@/types/vendor-type.types"
import type { VendorListResult } from "@/types"

export const metadata: Metadata = { title: "Vendor Type — Vendors" }

const PAGE_SIZE = 10

const STATUS_OPTIONS: FilterStatusOption[] = [
  { value: "ACTIVE",    label: "Active",    dot: "bg-success" },
  { value: "SUSPENDED", label: "Suspended", dot: "bg-warning" },
  { value: "BANNED",    label: "Banned",    dot: "bg-destructive" },
]

interface Props {
  params      : Promise<{ id: string }>
  searchParams: Promise<{ page?: string; search?: string; status?: string }>
}

export default async function VendorTypeVendorsPage({ params, searchParams }: Props) {
  const { id } = await params
  const session = await getAdminSession()

  if (!session.permissions.includes(AdminPermissions.SETTINGS_VENDOR_TYPES_READ)
    || !session.permissions.includes(AdminPermissions.VENDORS_ACCOUNTS_READ)) redirect("/vendors")

  let vendorType: VendorType
  try {
    vendorType = await adminFetch<VendorType>(`/admin/v1/vendor-types/${id}`, {
      next: { revalidate: 60, tags: [`vendor-type-${id}`] },
    })
  } catch (err) {
    if (err instanceof ApiCallError && err.status === 404) notFound()
    throw err
  }

  const qp     = await searchParams
  const page   = qp.page   ?? "1"
  const search = qp.search ?? ""
  const status = qp.status ?? ""

  const qs = new URLSearchParams({
    vendorTypeId: id,
    page, pageSize: String(PAGE_SIZE),
    ...(search ? { search } : {}),
    ...(status && status !== "all" ? { status } : {}),
  })

  const result = await adminFetch<VendorListResult>(`/admin/v1/vendors/accounts?${qs}`, {
    next: { revalidate: 60, tags: [`vendor-type-${id}-vendors`] },
  }).catch(() => null)

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
          <Store className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {vendorType.name} — Vendor Accounts
          </h1>
          <p className="text-sm text-muted-foreground">All vendor accounts of this type.</p>
        </div>
      </div>

      <TableFilterBar
        searchPlaceholder="Search business or email…"
        defaultSearch={search}
        statusOptions={STATUS_OPTIONS}
        defaultStatus={status}
      />

      <VendorTypeVendorAccountsTable
        result={result}
        page={page}
        search={search}
        status={status}
        vendorTypeId={id}
      />
    </div>
  )
}
