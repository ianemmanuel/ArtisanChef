import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { adminFetch, ApiCallError } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { CountryFinancialConfigManager } from "@/components/finance/CountryFinancialConfigManager"
import { AdminPermissions } from "@repo/types/admin-app"
import type {
  Country,
  CountryFinancialConfigView,
  PaymentProviderListResult,
  Currency,
} from "@repo/types/admin-app"

export const revalidate = 30

interface Props { params: Promise<{ countrySlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { countrySlug } = await params
  return { title: `Finance — ${countrySlug}` }
}

export default async function CountryFinancePage({ params }: Props) {
  const session = await getAdminSession()
  if (!session.permissions.includes(AdminPermissions.FINANCE_CONFIGURATION_READ)) redirect("/overview")

  const { countrySlug } = await params

  let country: Country
  try {
    country = await adminFetch<Country>(`/admin/v1/countries/${countrySlug}`, {
      next: { revalidate: 30, tags: [`country-${countrySlug}`] },
    })
  } catch (err) {
    if (err instanceof ApiCallError && err.status === 404) notFound()
    throw err
  }

  const [view, providers, currencies] = await Promise.all([
    adminFetch<CountryFinancialConfigView>(`/admin/v1/finance/countries/${countrySlug}/financial-config`, {
      next: { revalidate: 30, tags: [`finance-country-config-${countrySlug}`] },
    }).catch(() => null),
    adminFetch<PaymentProviderListResult>("/admin/v1/finance/providers?status=ACTIVE&pageSize=100", {
      next: { revalidate: 300, tags: ["finance-providers"] },
    }).then((r) => r.providers).catch(() => []),
    adminFetch<Currency[]>("/admin/v1/finance/currencies?status=ACTIVE", {
      next: { revalidate: 300, tags: ["finance-currencies"] },
    }).catch(() => []),
  ])

  if (!view) notFound()

  return (
    <div className="page-content animate-slide-up">
      <Link
        href="/finance/countries"
        className="group inline-flex w-fit items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card shadow-[var(--shadow-xs)] transition-all group-hover:-translate-x-0.5 group-hover:border-primary/40 group-hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
        </span>
        All countries
      </Link>

      <CountryFinancialConfigManager
        countrySlug={countrySlug}
        countryName={country.name}
        countryStatus={country.status}
        legacyCurrency={country.currency}
        view={view}
        providers={providers}
        currencies={currencies}
      />
    </div>
  )
}
