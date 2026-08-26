"use client"

import * as React from "react"
import { toast } from "sonner"
import { FileText, Loader2, Upload, CheckCircle2, XCircle, AlertTriangle, Clock, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { validateFile, uploadToPresignedUrl } from "@/lib/onboarding/upload"
import { usePresignAccountUpload, useUpsertAccountDocument } from "@/lib/queries/account-documents"
import { ClientApiError } from "@/lib/api/client"
import { DocumentPreviewSheet } from "@/components/onboarding/documents/DocumentPreviewSheet"
import type { VendorAccountDocumentStatusRow } from "@repo/types/vendor-app"

const STATUS_BADGE: Record<VendorAccountDocumentStatusRow["actionStatus"], { label: string; className: string }> = {
  MISSING       : { label: "Missing — required", className: "bg-destructive-bg text-destructive" },
  NOT_UPLOADED  : { label: "Not uploaded", className: "bg-muted text-muted-foreground" },
  PENDING_REVIEW: { label: "Pending review", className: "bg-muted text-muted-foreground" },
  APPROVED      : { label: "Approved", className: "bg-success-bg text-success" },
  EXPIRING_SOON : { label: "Expiring soon — renew it", className: "bg-warning-bg text-warning" },
  EXPIRED       : { label: "Expired — replace it", className: "bg-destructive-bg text-destructive" },
  REJECTED      : { label: "Sent back — replace it", className: "bg-destructive-bg text-destructive" },
}

const ICON_FOR_STATUS: Record<VendorAccountDocumentStatusRow["actionStatus"], React.ElementType> = {
  MISSING: FileText, NOT_UPLOADED: FileText, PENDING_REVIEW: Clock, APPROVED: CheckCircle2,
  EXPIRING_SOON: AlertTriangle, EXPIRED: XCircle, REJECTED: XCircle,
}

export function AccountDocumentUploadCard({ row }: { row: VendorAccountDocumentStatusRow }) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [progress, setProgress] = React.useState<number | null>(null)
  const [previewOpen, setPreviewOpen] = React.useState(false)

  const presign = usePresignAccountUpload()
  const upsert = useUpsertAccountDocument()

  const isUploading = progress !== null
  const doc = row.currentDocument
  const Icon = ICON_FOR_STATUS[row.actionStatus]
  const statusBadge = STATUS_BADGE[row.actionStatus]
  const needsAttention = ["MISSING", "EXPIRED", "EXPIRING_SOON", "REJECTED"].includes(row.actionStatus)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    const validationError = validateFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setProgress(0)
    try {
      const { uploadUrl, storageKey } = await presign.mutateAsync({
        documentTypeId: row.documentTypeId,
        fileName: file.name,
        fileType: file.type,
      })

      await uploadToPresignedUrl(uploadUrl, file, setProgress)

      await upsert.mutateAsync({
        documentTypeId: row.documentTypeId,
        storageKey,
        documentName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      })

      toast.success(`${row.documentTypeName} submitted for review`)
    } catch (err) {
      toast.error(err instanceof ClientApiError || err instanceof Error ? err.message : "Upload failed")
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-xl border bg-card p-4", needsAttention ? "border-destructive/30" : "border-border")}>
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", doc?.status === "APPROVED" ? "bg-success-bg" : needsAttention ? "bg-destructive-bg" : "bg-muted")}>
          <Icon className={cn("size-5", doc?.status === "APPROVED" ? "text-success" : needsAttention ? "text-destructive" : "text-muted-foreground")} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{row.documentTypeName}</p>
            {row.isRequired && (
              <Badge variant="outline" className="shrink-0 text-[10px]">Required</Badge>
            )}
          </div>
          {isUploading ? (
            <div className="mt-2 flex items-center gap-2">
              <Progress value={progress ?? 0} className="h-1.5 w-32" />
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
          ) : (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {doc?.documentName && <span className="truncate text-xs text-muted-foreground">{doc.documentName}</span>}
              <Badge variant="outline" className={cn("shrink-0 text-[10px]", statusBadge.className)}>{statusBadge.label}</Badge>
              {doc?.expiryDate && (row.actionStatus === "EXPIRING_SOON" || row.actionStatus === "EXPIRED" || row.actionStatus === "APPROVED") && (
                <span className="text-xs text-muted-foreground">
                  {row.actionStatus === "EXPIRED" ? "Expired" : "Expires"} {new Date(doc.expiryDate).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
          {doc?.status === "REJECTED" && doc.revisionNotes && (
            <p className="mt-1 text-xs text-destructive">{doc.revisionNotes}</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
        {isUploading ? (
          <Button variant="ghost" size="sm" disabled>
            <Loader2 className="size-4 animate-spin" /> Uploading
          </Button>
        ) : (
          <>
            {doc && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewOpen(true)}>
                <Eye className="size-3.5" /> View
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <Upload className="size-3.5" /> {doc ? "Replace" : "Upload"}
            </Button>
          </>
        )}
      </div>

      {doc && (
        <DocumentPreviewSheet
          document={{ id: doc.id, documentName: doc.documentName, documentTypeId: doc.documentTypeId, storageKey: "", mimeType: doc.mimeType, status: doc.status }}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}
    </div>
  )
}
