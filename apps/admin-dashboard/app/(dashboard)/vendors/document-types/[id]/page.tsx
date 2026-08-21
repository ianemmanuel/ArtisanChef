import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FileText, Clock, ShieldCheck } from "lucide-react"
import { adminFetch, ApiCallError } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { AdminPermissions } from "@repo/types/admin-app"
import { DocumentTypeStatusBadge } from "@/components/document-types/DocumentTypeStatusBadge"
import { DocumentTypeStatusAction } from "@/components/document-types/DocumentTypeStatusAction"
import { DocumentTypeFormDialog } from "@/components/document-types/DocumentTypeFormDialog"
import { DocumentTypeVendorTypeManager } from "@/components/document-types/DocumentTypeVendorTypeManager"
import type { DocumentTypeConfig } from "@/types/document-type.types"
import type { VendorType, CountryLite } from "@/types/vendor-type.types"

export const metadata: Metadata = { title: "Document Type" }

interface Props { params: Promise<{ id: string }> }

export default async function DocumentTypeDetailPage({ params }: Props) {
  const { id } = await params
  const session = await getAdminSession()

  if (!session.permissions.includes(AdminPermissions.SETTINGS_DOCUMENTS_READ)) redirect("/vendors")

  const canWrite = session.permissions.includes(AdminPermissions.SETTINGS_DOCUMENTS_WRITE)

  let documentType: DocumentTypeConfig
  try {
    documentType = await adminFetch<DocumentTypeConfig>(`/admin/v1/document-types/${id}`, {
      next: { revalidate: 60, tags: [`document-type-${id}`] },
    })
  } catch (err) {
    if (err instanceof ApiCallError && err.status === 404) notFound()
    throw err
  }

  const [country, vendorTypes] = await Promise.all([
    adminFetch<CountryLite>(`/admin/v1/countries/${documentType.countryId}`, { next: { revalidate: 300 } }).catch(() => null),
    adminFetch<VendorType[]>("/admin/v1/vendor-types", { next: { revalidate: 120 } }).catch(() => [] as VendorType[]),
  ])

  const canToggleStatus = documentType.status === "ACTIVE" || documentType.status === "INACTIVE"

  return (
    <div className="page-content animate-slide-up">

      <Link
        href="/vendors/document-types"
        className="group inline-flex w-fit items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card shadow-[var(--shadow-xs)] transition-all group-hover:-translate-x-0.5 group-hover:border-primary/40 group-hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
        </span>
        Back to Document Types
      </Link>

      <div className="admin-card flex items-center gap-4">
        <div className="icon-badge icon-badge-info h-14 w-14 shrink-0">
          <FileText className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-semibold text-foreground">{documentType.name}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {country?.name ?? "Unknown country"} · <span className="font-mono">{documentType.code}</span> · {documentType.scope === "VENDOR" ? "Vendor" : "Outlet"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DocumentTypeStatusBadge status={documentType.status} />
          {canWrite && (
            <>
              <DocumentTypeFormDialog documentType={documentType} />
              {canToggleStatus && (
                <DocumentTypeStatusAction id={documentType.id} name={documentType.name} status={documentType.status} />
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="admin-card space-y-3 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Details</h2>
          {documentType.description && (
            <p className="text-sm text-muted-foreground">{documentType.description}</p>
          )}
          {documentType.instructions && (
            <div className="rounded-xl border border-border/60 bg-muted/30 px-3.5 py-3">
              <p className="text-xs font-medium text-foreground">Shown to vendors</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{documentType.instructions}</p>
            </div>
          )}
          {documentType.sampleUrl && (
            <a
              href={documentType.sampleUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              View sample document
            </a>
          )}
        </div>

        <div className="admin-card space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Required</span>
            <span className="font-medium text-foreground">{documentType.isRequired ? "Yes" : "No"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Expires</span>
            <span className="font-medium text-foreground">{documentType.requiresExpiry ? "Yes" : "No"}</span>
          </div>
          {documentType.requiresExpiry && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Expiry warning</span>
              <span className="font-medium tabular-nums text-foreground">{documentType.expiryWarningDays} days</span>
            </div>
          )}
        </div>
      </div>

      <DocumentTypeVendorTypeManager
        documentTypeId={documentType.id}
        links={documentType.vendorTypeConfigs}
        allVendorTypes={vendorTypes}
        canWrite={canWrite}
      />
    </div>
  )
}
