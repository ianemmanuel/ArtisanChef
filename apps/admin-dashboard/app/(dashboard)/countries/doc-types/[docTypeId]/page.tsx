import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FileText } from "lucide-react"
import { adminFetch, ApiCallError } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { getScopeTier } from "@/lib/auth/scope-tier"
import { DocumentTypeStatusBadge } from "@/components/document-types/DocumentTypeStatusBadge"
import { DocumentTypeDetailCard } from "@/components/document-types/DocumentTypeDetailCard"
import { AdminPermissions } from "@repo/types/admin-app"
import type { Country } from "@repo/types/admin-app"
import type { DocumentTypeConfig } from "@/types/document-type.types"

export const revalidate = 60

interface Props { params: Promise<{ docTypeId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { docTypeId } = await params
  return { title: docTypeId }
}

export default async function DocumentTypeDetailPage({ params }: Props) {
  const session = await getAdminSession()

  if (!session.permissions.includes(AdminPermissions.SETTINGS_DOCUMENTS_READ)) redirect("/vendors")
  // This route lives under /countries/* — same guard as every other page there.
  if (getScopeTier(session) === "CITY") redirect("/cities")

  const { docTypeId } = await params

  let documentType: DocumentTypeConfig
  try {
    documentType = await adminFetch<DocumentTypeConfig>(`/admin/v1/document-types/${docTypeId}`, {
      next: { revalidate: 60, tags: [`document-type-${docTypeId}`] },
    })
  } catch (err) {
    if (err instanceof ApiCallError && err.status === 404) notFound()
    throw err
  }

  // Supplementary — country name/city name are nice-to-have context, not
  // load-bearing, so a failure here degrades to showing the raw ids.
  const country = await adminFetch<Country>(`/admin/v1/countries/${documentType.countryId}`, {
    next: { revalidate: 300, tags: [`country-${documentType.countryId}`] },
  }).catch(() => null)

  const countryName = country?.name ?? documentType.countryId
  const countrySlug = country?.slug ?? documentType.countryId
  const cityName = documentType.cityId
    ? (country?.cities.find((c) => c.id === documentType.cityId)?.name ?? documentType.cityId)
    : null

  return (
    <div className="page-content animate-slide-up">

      <Link
        href={`/vendors/document-types${country ? `?country=${country.slug}` : ""}`}
        className="group inline-flex w-fit items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card shadow-[var(--shadow-xs)] transition-all group-hover:-translate-x-0.5 group-hover:border-primary/40 group-hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
        </span>
        Back to Document Types
      </Link>

      <div className="admin-card flex flex-wrap items-center gap-4">
        <div className="icon-badge icon-badge-info h-14 w-14 shrink-0">
          <FileText className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-semibold text-foreground">{documentType.name}</h1>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{documentType.code}</p>
        </div>
        <DocumentTypeStatusBadge status={documentType.status} />
      </div>

      <DocumentTypeDetailCard
        documentType={documentType}
        countryName={countryName}
        countrySlug={countrySlug}
        cityName={cityName}
      />

    </div>
  )
}
