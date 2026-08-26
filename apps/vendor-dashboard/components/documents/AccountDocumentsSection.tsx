"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { AccountDocumentUploadCard } from "./AccountDocumentUploadCard"
import { useAccountDocumentStatus } from "@/lib/queries/account-documents"

export function AccountDocumentsSection() {
  const { data, isLoading } = useAccountDocumentStatus()

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No documents are required for your business type.</p>
  }

  const needsAttention = data.filter((r) => ["MISSING", "EXPIRED", "EXPIRING_SOON", "REJECTED"].includes(r.actionStatus))
  const rest = data.filter((r) => !needsAttention.includes(r))

  return (
    <div className="space-y-3">
      {[...needsAttention, ...rest].map((row) => (
        <AccountDocumentUploadCard key={row.documentTypeId} row={row} />
      ))}
    </div>
  )
}
