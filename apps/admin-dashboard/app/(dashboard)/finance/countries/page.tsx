import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Landmark, CheckCircle2, CircleAlert, ChevronRight } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table"
import { adminFetch } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { EmptyState } from "@/components/shared/EmptyState"
import { AdminPermissions } from "@repo/types/admin-app"
import type { CountryListResult } from "@repo/types/admin-app"

export const metadata: Metadata = { title: "Country Finance" }
export const revalidate = 60

/*
 * Finance Phase 1B — per-country financial configuration. Lists every
 * country in scope (INCLUDING inactive ones — financial config is set up
 * BEFORE a country is activated) and links into each one's config page.
 * Gated on finance:configuration:read; city-scoped admins never reach it
 * (they don't hold the permission).
 */
export default async function FinanceCountriesPage() {
  const session = await getAdminSession()
  if (!session.permissions.includes(AdminPermissions.FINANCE_CONFIGURATION_READ)) redirect("/overview")

  const result = await adminFetch<CountryListResult>("/admin/v1/countries?pageSize=200", {
    next: { revalidate: 60, tags: ["countries"] },
  }).catch(() => null)
  const countries = result?.countries ?? []

  return (
    <div className="page-content animate-slide-up">
      <Link
        href="/finance"
        className="group inline-flex w-fit items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card shadow-[var(--shadow-xs)] transition-all group-hover:-translate-x-0.5 group-hover:border-primary/40 group-hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
        </span>
        Back to Finance
      </Link>

      <div className="admin-card flex items-center gap-4">
        <div className="icon-badge icon-badge-primary h-12 w-12">
          <Landmark className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Country Finance</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Currency, payment provider, provider accounts, and the collection/payout configuration each country
            needs before it can be activated.
          </p>
        </div>
      </div>

      {countries.length === 0 ? (
        <EmptyState icon={Landmark} title="No countries in scope" description="Nothing to configure." />
      ) : (
        <div className="admin-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs uppercase tracking-wide">Country</TableHead>
                  <TableHead className="hidden text-xs uppercase tracking-wide sm:table-cell">Country status</TableHead>
                  <TableHead className="hidden text-xs uppercase tracking-wide md:table-cell">Currency</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countries.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/10">
                    <TableCell>
                      <Link href={`/finance/countries/${c.slug}`} className="font-medium text-foreground hover:text-primary hover:underline">
                        {c.name}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground">{c.code}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className={c.status === "ACTIVE" ? "badge-success" : "badge-neutral"}>
                        {c.status === "ACTIVE"
                          ? <><CheckCircle2 className="mr-1 inline h-3 w-3" />Active</>
                          : <><CircleAlert className="mr-1 inline h-3 w-3" />Inactive</>}
                      </span>
                    </TableCell>
                    <TableCell className="hidden font-mono text-sm text-muted-foreground md:table-cell">{c.currency}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/finance/countries/${c.slug}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        Configure <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
