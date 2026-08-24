import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Ban } from "lucide-react"
import { adminFetch, ApiCallError } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { DeactivatedDocumentsTable } from "@/components/document-types/DeactivatedDocumentsTable"
import { AdminPermissions } from "@repo/types/admin-app"
import type { Country } from "@repo/types/admin-app"
import type { DocumentTypeListResult } from "@/types/document-type.types"

export const revalidate = 60
const PAGE_SIZE = 10

interface Props {
  params: Promise<{ countrySlug: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { countrySlug } = await params
  return { title: `Deactivated documents — ${countrySlug}` }
}

export default async function DeactivatedDocumentsPage({ params, searchParams }: Props) {
  const session = await getAdminSession()
  if (!session.permissions.includes(AdminPermissions.SETTINGS_GEOGRAPHY_WRITE) || !session.scope.isGlobal) {
    redirect("/overview")
  }
  const canWrite = session.permissions.includes(AdminPermissions.SETTINGS_DOCUMENTS_WRITE)

  const { countrySlug } = await params
  const { page = "1" } = await searchParams

  let country: Country
  try {
    country = await adminFetch<Country>(`/admin/v1/countries/${countrySlug}`, { next: { revalidate: 60, tags: [`country-${countrySlug}`] } })
  } catch (err) {
    if (err instanceof ApiCallError && err.status === 404) notFound()
    throw err
  }

  const result = await adminFetch<DocumentTypeListResult>(
    `/admin/v1/document-types?countryId=${country.id}&status=INACTIVE&page=${page}&pageSize=${PAGE_SIZE}`,
    { next: { revalidate: 60, tags: [`document-types-${country.id}`] } },
  ).catch(() => null)

  return (
    <div className="page-content animate-slide-up">
      <Link href={`/countries/${country.slug}/documents`} className="group inline-flex w-fit items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card shadow-[var(--shadow-xs)] transition-all group-hover:-translate-x-0.5 group-hover:border-primary/40 group-hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
        </span>
        Back to Documents
      </Link>

      <div className="admin-card flex items-center gap-4">
        <div className="icon-badge icon-badge-danger h-12 w-12">
          <Ban className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Deactivated Documents</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">No longer required from vendors in {country.name}.</p>
        </div>
      </div>

      <DeactivatedDocumentsTable
        result={result}
        page={page}
        countryId={country.id}
        basePath={`/countries/${country.slug}/documents/deactivated`}
        canWrite={canWrite}
      />
    </div>
  )
}
