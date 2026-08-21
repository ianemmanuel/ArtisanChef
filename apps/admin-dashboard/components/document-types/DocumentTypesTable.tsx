import Link from "next/link"
import { FileText } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table"
import { Button } from "@repo/ui/components/button"
import { EmptyState } from "@/components/shared/EmptyState"
import { TablePagination } from "@/components/shared/TablePagination"
import { DocumentTypeStatusBadge } from "./DocumentTypeStatusBadge"
import { DocumentTypeStatusAction } from "./DocumentTypeStatusAction"
import type { DocumentTypeListResult } from "@/types/document-type.types"

interface Props {
  result      : DocumentTypeListResult | null
  page        : string
  countrySlug : string
  search      : string
  canWrite    : boolean
}

export function DocumentTypesTable({ result, page, countrySlug, search, canWrite }: Props) {
  if (!result || result.documentTypes.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No document types for this country"
        description="Create one to start requiring it during vendor or outlet onboarding."
      />
    )
  }

  return (
    <div className="admin-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="text-xs uppercase tracking-wide">Name</TableHead>
              <TableHead className="hidden text-xs uppercase tracking-wide sm:table-cell">Code</TableHead>
              <TableHead className="hidden text-xs uppercase tracking-wide md:table-cell">Scope</TableHead>
              <TableHead className="hidden text-xs uppercase tracking-wide lg:table-cell">Required</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.documentTypes.map((dt) => (
              <TableRow key={dt.id} className="hover:bg-muted/10">
                <TableCell>
                  <Link href={`/countries/doc-types/${dt.id}`} className="group flex items-center gap-3">
                    <div className="icon-badge icon-badge-info h-9 w-9 shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-foreground transition-colors group-hover:text-primary">
                      {dt.name}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">
                  {dt.code}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {dt.scope === "VENDOR" ? "Vendor" : "Outlet"}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className={dt.isRequired ? "badge-info" : "badge-neutral"}>
                    {dt.isRequired ? "Required" : "Optional"}
                  </span>
                </TableCell>
                <TableCell><DocumentTypeStatusBadge status={dt.status} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button asChild variant="ghost" size="sm" className="rounded-full">
                      <Link href={`/countries/doc-types/${dt.id}`}>Manage</Link>
                    </Button>
                    {canWrite && (dt.status === "ACTIVE" || dt.status === "INACTIVE") && (
                      <DocumentTypeStatusAction id={dt.id} name={dt.name} status={dt.status} />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        total={result.total}
        page={page}
        totalPages={result.totalPages}
        basePath="/vendors/document-types"
        params={{
          country: countrySlug,
          ...(search ? { search } : {}),
        }}
        itemLabel="document types"
      />
    </div>
  )
}
