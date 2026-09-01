"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { OutletDocumentUploadCard } from "./OutletDocumentUploadCard"
import { useOutletDocumentStatus } from "@/lib/queries/outlet-documents"

export function OutletDocumentsSection({ outletId }: { outletId: string }) {
  const { data, isLoading } = useOutletDocumentStatus(outletId)

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No documents are required for this outlet.</p>
  }

  const needsAttention = data.filter((r) => ["MISSING", "EXPIRED", "EXPIRING_SOON", "REJECTED"].includes(r.actionStatus))
  const rest = data.filter((r) => !needsAttention.includes(r))

  return (
    <div className="space-y-3">
      {[...needsAttention, ...rest].map((row) => (
        <OutletDocumentUploadCard key={row.documentTypeId} outletId={outletId} row={row} />
      ))}
    </div>
  )
}
