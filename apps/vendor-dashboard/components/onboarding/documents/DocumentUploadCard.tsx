"use client"

import * as React from "react"
import { toast } from "sonner"
import { FileText, Loader2, Trash2, Upload, CheckCircle2, XCircle, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { validateFile, uploadToPresignedUrl } from "@/lib/onboarding/upload"
import { usePresignUpload, useUpsertDocument, useDeleteDocument } from "@/lib/queries/onboarding"
import { ClientApiError } from "@/lib/api/client"
import { DocumentPreviewSheet } from "./DocumentPreviewSheet"
import type { DocumentRequirement } from "@repo/types/vendor-app"

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending review", className: "bg-muted text-muted-foreground" },
  APPROVED: { label: "Approved", className: "bg-success-bg text-success" },
  REJECTED: { label: "Rejected — replace this file", className: "bg-destructive-bg text-destructive" },
}

export function DocumentUploadCard({ requirement, disabled }: { requirement: DocumentRequirement; disabled?: boolean }) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [progress, setProgress] = React.useState<number | null>(null)
  const [previewOpen, setPreviewOpen] = React.useState(false)

  const presign = usePresignUpload()
  const upsert = useUpsertDocument()
  const remove = useDeleteDocument()

  const isUploading = progress !== null
  const doc = requirement.uploadedDocument

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
        documentTypeId: requirement.documentTypeId,
        fileName: file.name,
        fileType: file.type,
      })

      await uploadToPresignedUrl(uploadUrl, file, setProgress)

      await upsert.mutateAsync({
        documentTypeId: requirement.documentTypeId,
        storageKey,
        documentName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      })

      toast.success(`${requirement.name} uploaded`)
    } catch (err) {
      toast.error(err instanceof ClientApiError || err instanceof Error ? err.message : "Upload failed")
    } finally {
      setProgress(null)
    }
  }

  async function handleRemove() {
    if (!doc) return
    try {
      await remove.mutateAsync(doc.id)
      toast.success(`${requirement.name} removed`)
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Couldn't remove this document")
    }
  }

  const statusBadge = doc ? STATUS_BADGE[doc.status] : undefined

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            doc ? "bg-success-bg" : "bg-muted",
          )}
        >
          {doc ? (
            doc.status === "REJECTED" ? (
              <XCircle className="size-5 text-destructive" />
            ) : (
              <CheckCircle2 className="size-5 text-success" />
            )
          ) : (
            <FileText className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{requirement.name}</p>
            {requirement.isRequired && (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                Required
              </Badge>
            )}
          </div>
          {doc ? (
            <div className="mt-1 flex items-center gap-2">
              <span className="truncate text-xs text-muted-foreground">{doc.documentName ?? "Uploaded file"}</span>
              {statusBadge && (
                <Badge variant="outline" className={cn("shrink-0 text-[10px]", statusBadge.className)}>
                  {statusBadge.label}
                </Badge>
              )}
            </div>
          ) : isUploading ? (
            <div className="mt-2 flex items-center gap-2">
              <Progress value={progress ?? 0} className="h-1.5 w-32" />
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">PDF, JPEG, PNG, or WebP — up to 10MB</p>
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
          disabled={disabled || isUploading}
        />
        {isUploading ? (
          <Button variant="ghost" size="sm" disabled>
            <Loader2 className="size-4 animate-spin" /> Uploading
          </Button>
        ) : (
          <>
            {doc && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="size-3.5" /> View
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-3.5" /> {doc ? "Replace" : "Upload"}
            </Button>
            {doc && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled || remove.isPending}
                onClick={handleRemove}
                aria-label={`Remove ${requirement.name}`}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            )}
          </>
        )}
      </div>

      {doc && (
        <DocumentPreviewSheet document={doc} open={previewOpen} onOpenChange={setPreviewOpen} />
      )}
    </div>
  )
}
