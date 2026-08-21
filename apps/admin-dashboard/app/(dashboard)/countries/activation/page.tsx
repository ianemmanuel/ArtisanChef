import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Power } from "lucide-react"
import { adminFetch } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { CountriesTable } from "@/components/countries/CountriesTable"
import { TableFilterBar } from "@/components/shared/TableFilterBar"
import { AdminPermissions } from "@repo/types/admin-app"
import type { CountryListResult } from "@repo/types/admin-app"

export const metadata: Metadata = { title: "Country Activation" }
export const revalidate = 60

const PAGE_SIZE = 10

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string }>
}

export default async function CountryActivationPage({ searchParams }: PageProps) {
  const session = await getAdminSession()

  if (!session.permissions.includes(AdminPermissions.SETTINGS_GEOGRAPHY_READ)) redirect("/overview")
  // Activate/deactivate hard-requires global scope server-side regardless of
  // permission — a country-scoped WRITE holder would still 403, so this page
  // is off-limits entirely rather than shown-then-disabled. The nav doesn't
  // link here for non-global admins either; this is defense in depth.
  if (!session.scope.isGlobal) redirect("/countries")

  const { page = "1", search = "" } = await searchParams

  const query = new URLSearchParams({ page, pageSize: String(PAGE_SIZE) })
  if (search) query.set("search", search)

  const result = await adminFetch<CountryListResult>(`/admin/v1/countries?${query.toString()}`, {
    next: { revalidate: 60, tags: ["countries"] },
  }).catch(() => null)

  const countries   = result?.countries ?? []
  const total       = result?.total ?? 0
  const totalPages  = result?.totalPages ?? 1

  const canWrite = session.permissions.includes(AdminPermissions.SETTINGS_GEOGRAPHY_WRITE)

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

      <div className="admin-card flex items-center gap-4">
        <div className="icon-badge icon-badge-primary h-12 w-12">
          <Power className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Country Activation</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Activate or deactivate countries for vendor onboarding and orders.
          </p>
        </div>
      </div>

      <TableFilterBar showSearch searchPlaceholder="Search countries…" defaultSearch={search} />

      <CountriesTable
        countries={countries}
        canWrite={canWrite}
        isGlobal={session.scope.isGlobal}
        pagination={{
          total,
          page,
          totalPages,
          basePath: "/countries/activation",
          params: search ? { search } : {},
        }}
      />
    </div>
  )
}
