"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { DocumentUploadCard } from "./DocumentUploadCard"
import { useDocumentRequirements } from "@/lib/queries/onboarding"

export function DocumentsSection({ disabled }: { disabled?: boolean }) {
  const { data, isLoading } = useDocumentRequirements({ enabled: true })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    )
  }

  if (!data || data.requirements.length === 0) {
    return <p className="text-sm text-muted-foreground">No documents are required for this business type.</p>
  }

  return (
    <div className="space-y-3">
      {data.requirements.map((requirement) => (
        <DocumentUploadCard key={requirement.documentTypeId} requirement={requirement} disabled={disabled} />
      ))}
    </div>
  )
}
