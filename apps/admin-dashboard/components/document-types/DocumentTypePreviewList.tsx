import Link from "next/link"
import { FileText } from "lucide-react"
import { EmptyState } from "@/components/shared/EmptyState"
import { DocumentTypeStatusBadge } from "./DocumentTypeStatusBadge"
import type { DocumentTypeConfig } from "@/types/document-type.types"

interface Props {
  documentTypes: DocumentTypeConfig[]
  total        : number
}

/**
 * Small read-only preview for the country detail page — NOT DocumentTypesTable
 * (a parallel workstream owns that file and is adding pagination to it).
 */
export function DocumentTypePreviewList({ documentTypes, total }: Props) {
  if (documentTypes.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No document types yet"
        description="Onboarding document requirements for this country will show up here."
      />
    )
  }

  return (
    <div className="admin-card overflow-hidden p-0">
      <div className="divide-y divide-border">
        {documentTypes.map((dt) => (
          <Link
            key={dt.id}
            href={`/countries/doc-types/${dt.id}`}
            className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
          >
            <div className="icon-badge icon-badge-info h-9 w-9 shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                {dt.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {dt.scope === "VENDOR" ? "Vendor" : "Outlet"} · {dt.isRequired ? "Required" : "Optional"}
              </p>
            </div>
            <DocumentTypeStatusBadge status={dt.status} />
          </Link>
        ))}
      </div>
      {total > documentTypes.length && (
        <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          Showing {documentTypes.length} of {total}
        </p>
      )}
    </div>
  )
}
