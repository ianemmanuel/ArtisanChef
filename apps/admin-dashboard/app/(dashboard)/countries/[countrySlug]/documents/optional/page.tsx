import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FileQuestion } from "lucide-react"
import { adminFetch, ApiCallError } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { assertDocumentsHomeAccess, assertCountryInDocumentsScope } from "@/lib/countries/documents-access"
import { ActiveDocumentsTable } from "@/components/document-types/ActiveDocumentsTable"
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
  return { title: `Optional documents — ${countrySlug}` }
}

export default async function OptionalDocumentsPage({ params, searchParams }: Props) {
  const session = await getAdminSession()
  const { canWrite } = assertDocumentsHomeAccess(session)

  const { countrySlug } = await params
  const { page = "1" } = await searchParams

  let country: Country
  try {
    country = await adminFetch<Country>(`/admin/v1/countries/${countrySlug}`, { next: { revalidate: 60, tags: [`country-${countrySlug}`] } })
  } catch (err) {
    if (err instanceof ApiCallError && err.status === 404) notFound()
    throw err
  }
  assertCountryInDocumentsScope(session, country.id)

  const result = await adminFetch<DocumentTypeListResult>(
    `/admin/v1/document-types?countryId=${country.id}&status=ACTIVE&isRequired=false&page=${page}&pageSize=${PAGE_SIZE}`,
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
        <div className="icon-badge icon-badge-neutral h-12 w-12">
          <FileQuestion className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Optional Documents</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Vendors in {country.name} may skip these and still complete onboarding.</p>
        </div>
      </div>

      <ActiveDocumentsTable
        result={result}
        page={page}
        countryId={country.id}
        countrySlug={country.slug}
        basePath={`/countries/${country.slug}/documents/optional`}
        canWrite={canWrite}
        emptyTitle="No optional documents"
        emptyDescription="Documents marked optional in this country will show up here."
      />
    </div>
  )
}
