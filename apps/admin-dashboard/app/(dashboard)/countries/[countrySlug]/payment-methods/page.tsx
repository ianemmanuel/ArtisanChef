import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CreditCard, ArrowDownToLine, ArrowUpFromLine } from "lucide-react"
import { adminFetch, ApiCallError } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { EmptyState } from "@/components/shared/EmptyState"
import { ConfigureCountryPaymentMethodDialog } from "@/components/payment-methods/ConfigureCountryPaymentMethodDialog"
import { CountryPaymentMethodStatusToggle } from "@/components/payment-methods/CountryPaymentMethodStatusToggle"
import { AdminPermissions } from "@repo/types/admin-app"
import type { Country } from "@repo/types/admin-app"
import type { CountryPaymentMethodConfig, PaymentMethod, PaymentMethodListResult } from "@/types"

export const revalidate = 60

interface Props { params: Promise<{ countrySlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { countrySlug } = await params
  return { title: `Payment Methods — ${countrySlug}` }
}

export default async function CountryPaymentMethodsPage({ params }: Props) {
  const session = await getAdminSession()

  // Deliberately its own permission, distinct from SETTINGS_GEOGRAPHY_WRITE
  // (the gate every other /countries/[slug]/... page uses) — this is
  // finance/operations_admin territory, not geography config (see
  // admin.paymentMethod.service.ts). Read is scope-filtered (a country-
  // scoped finance admin sees their own country); every mutation still
  // requires GLOBAL scope regardless of permission.
  if (!session.permissions.includes(AdminPermissions.FINANCE_PAYMENT_METHODS_READ)) redirect("/overview")
  const canManage = session.scope.isGlobal && session.permissions.includes(AdminPermissions.FINANCE_PAYMENT_METHODS_MANAGE)

  const { countrySlug } = await params

  let country: Country
  try {
    country = await adminFetch<Country>(`/admin/v1/countries/${countrySlug}`, {
      next: { revalidate: 60, tags: [`country-${countrySlug}`] },
    })
  } catch (err) {
    if (err instanceof ApiCallError && err.status === 404) notFound()
    throw err
  }

  if (!session.scope.isGlobal && !session.scope.countryIds.includes(country.id)) redirect("/overview")

  const [configs, catalogResult] = await Promise.all([
    adminFetch<CountryPaymentMethodConfig[]>(`/admin/v1/payment-methods/countries/${countrySlug}`, {
      next: { revalidate: 60, tags: [`country-payment-methods-${country.id}`, "payment-methods"] },
    }).catch(() => [] as CountryPaymentMethodConfig[]),
    canManage
      ? adminFetch<PaymentMethodListResult>("/admin/v1/payment-methods?isActive=true&pageSize=100", {
          next: { revalidate: 300, tags: ["payment-methods"] },
        }).catch(() => null)
      : Promise.resolve(null),
  ])

  const catalog: PaymentMethod[] = catalogResult?.methods ?? []
  const inbound  = configs.filter((c) => c.direction === "INBOUND")
  const outbound = configs.filter((c) => c.direction === "OUTBOUND")

  return (
    <div className="page-content animate-slide-up">
      <Link
        href={`/countries/${country.slug}`}
        className="group inline-flex w-fit items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card shadow-[var(--shadow-xs)] transition-all group-hover:-translate-x-0.5 group-hover:border-primary/40 group-hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
        </span>
        Back to {country.name}
      </Link>

      <div className="admin-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="icon-badge icon-badge-primary h-12 w-12">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Payment Methods</h1>
            <p className="text-sm text-muted-foreground">
              Which payment gateways {country.name} accepts from customers and pays out to vendors with.
            </p>
          </div>
        </div>
        {canManage && <ConfigureCountryPaymentMethodDialog countryId={country.id} methods={catalog} />}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PaymentMethodDirectionCard
          title="Inbound — Customer Payments"
          icon={ArrowDownToLine}
          configs={inbound}
          canManage={canManage}
          emptyDescription="No customer payment method configured yet — customer operations can't be marked ready for this country until one exists."
        />
        <PaymentMethodDirectionCard
          title="Outbound — Vendor Payouts"
          icon={ArrowUpFromLine}
          configs={outbound}
          canManage={canManage}
          emptyDescription="No vendor payout method configured yet — vendor onboarding can't be marked ready for this country until one exists."
        />
      </div>
    </div>
  )
}

function PaymentMethodDirectionCard({
  title, icon: Icon, configs, canManage, emptyDescription,
}: {
  title: string
  icon : typeof ArrowDownToLine
  configs: CountryPaymentMethodConfig[]
  canManage: boolean
  emptyDescription: string
}) {
  return (
    <div className="admin-card space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {configs.length === 0 ? (
        <EmptyState icon={Icon} title="Not configured" description={emptyDescription} />
      ) : (
        <ul className="divide-y divide-border/60">
          {configs.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{c.paymentMethod.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.verificationProvider ?? "No verification provider set"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={c.status === "ACTIVE" ? "badge-success" : c.status === "DEPRECATED" ? "badge-warning" : "badge-neutral"}>
                  {c.status}
                </span>
                {canManage && (
                  <CountryPaymentMethodStatusToggle id={c.id} name={c.paymentMethod.name} status={c.status} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
