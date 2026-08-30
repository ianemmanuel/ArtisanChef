"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Loader2, Upload, CheckCircle2, XCircle, AlertTriangle, Clock, Eye, ShieldAlert, FileText,
} from "lucide-react"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { validateFile, uploadToPresignedUrl } from "@/lib/onboarding/upload"
import { ClientApiError } from "@/lib/api/client"
import {
  usePresignOutletUpload, useUpsertOutletDocument, useOutletDocumentPreview,
} from "@/lib/queries/outlet-documents"
import type { OutletDocumentStatusRow } from "@repo/types/vendor-app"

const STATUS_BADGE: Record<OutletDocumentStatusRow["actionStatus"], { label: string; className: string }> = {
  MISSING       : { label: "Missing — required", className: "bg-destructive-bg text-destructive" },
  NOT_UPLOADED  : { label: "Not uploaded", className: "bg-muted text-muted-foreground" },
  PENDING_REVIEW: { label: "Pending review", className: "bg-muted text-muted-foreground" },
  APPROVED      : { label: "Approved", className: "bg-success-bg text-success" },
  EXPIRING_SOON : { label: "Expiring soon — renew it", className: "bg-warning-bg text-warning" },
  EXPIRED       : { label: "Expired — replace it", className: "bg-destructive-bg text-destructive" },
  REJECTED      : { label: "Sent back — replace it", className: "bg-destructive-bg text-destructive" },
}
const ICON: Record<OutletDocumentStatusRow["actionStatus"], React.ElementType> = {
  MISSING: FileText, NOT_UPLOADED: FileText, PENDING_REVIEW: Clock, APPROVED: CheckCircle2,
  EXPIRING_SOON: AlertTriangle, EXPIRED: XCircle, REJECTED: XCircle,
}

export function OutletDocumentUploadCard({ outletId, row }: { outletId: string; row: OutletDocumentStatusRow }) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [progress, setProgress] = React.useState<number | null>(null)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [pendingFile, setPendingFile] = React.useState<File | null>(null)
  const [expiryDate, setExpiryDate] = React.useState("")

  const presign = usePresignOutletUpload(outletId)
  const upsert = useUpsertOutletDocument(outletId)

  const isUploading = progress !== null
  const doc = row.currentDocument
  const Icon = ICON[row.actionStatus]
  const statusBadge = STATUS_BADGE[row.actionStatus]
  const needsAttention = ["MISSING", "EXPIRED", "EXPIRING_SOON", "REJECTED"].includes(row.actionStatus)

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const err = validateFile(file)
    if (err) { toast.error(err); return }
    if (row.requiresExpiry) { setPendingFile(file); return }
    void doUpload(file)
  }

  async function doUpload(file: File, expiry?: string) {
    setPendingFile(null)
    setProgress(0)
    try {
      const { uploadUrl, storageKey } = await presign.mutateAsync({
        documentTypeId: row.documentTypeId, fileName: file.name, fileType: file.type,
      })
      await uploadToPresignedUrl(uploadUrl, file, setProgress)
      await upsert.mutateAsync({
        documentTypeId: row.documentTypeId, storageKey,
        documentName: file.name, fileSize: file.size, mimeType: file.type,
        ...(expiry ? { expiryDate: new Date(expiry).toISOString() } : {}),
      })
      toast.success(`${row.documentTypeName} submitted for review`)
    } catch (e) {
      toast.error(e instanceof ClientApiError || e instanceof Error ? e.message : "Upload failed")
    } finally {
      setProgress(null)
      setExpiryDate("")
    }
  }

  return (
    <div className={cn("rounded-xl border bg-card p-4", needsAttention ? "border-destructive/30" : "border-border")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg",
            doc?.status === "APPROVED" ? "bg-success-bg" : needsAttention ? "bg-destructive-bg" : "bg-muted")}>
            <Icon className={cn("size-5", doc?.status === "APPROVED" ? "text-success" : needsAttention ? "text-destructive" : "text-muted-foreground")} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-medium text-foreground">{row.documentTypeName}</p>
              {row.isRequired && <Badge variant="outline" className="shrink-0 text-[10px]">Required</Badge>}
              {row.severity === "CRITICAL" && (
                <Badge variant="outline" className="shrink-0 gap-1 bg-warning-bg text-[10px] text-warning">
                  <ShieldAlert className="size-3" /> Gates go-live
                </Badge>
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
                {doc?.expiryDate && ["EXPIRING_SOON", "EXPIRED", "APPROVED"].includes(row.actionStatus) && (
                  <span className="text-xs text-muted-foreground">
                    {row.actionStatus === "EXPIRED" ? "Expired" : "Expires"} {new Date(doc.expiryDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
            {doc?.status === "REJECTED" && (doc.revisionNotes || doc.rejectionReason) && (
              <p className="mt-1 text-xs text-destructive">{doc.revisionNotes || doc.rejectionReason}</p>
            )}
            {row.instructions && !doc && (
              <p className="mt-1 text-xs text-muted-foreground">{row.instructions}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp"
            className="hidden" onChange={pickFile} disabled={isUploading} />
          {isUploading ? (
            <Button variant="ghost" size="sm" disabled><Loader2 className="size-4 animate-spin" /> Uploading</Button>
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
      </div>

      {/* Expiry prompt for expiry-tracked documents */}
      {pendingFile && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
          <div className="space-y-1">
            <Label className="text-xs" htmlFor={`exp-${row.documentTypeId}`}>Expiry date on the document</Label>
            <Input id={`exp-${row.documentTypeId}`} type="date" value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)} className="h-9 w-44 text-sm" />
          </div>
          <Button type="button" size="sm" disabled={!expiryDate} onClick={() => doUpload(pendingFile, expiryDate)}>
            Submit
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setPendingFile(null); setExpiryDate("") }}>
            Cancel
          </Button>
        </div>
      )}

      {doc && (
        <OutletDocPreview outletId={outletId} documentId={doc.id} name={doc.documentName} mimeType={doc.mimeType}
          open={previewOpen} onOpenChange={setPreviewOpen} />
      )}
    </div>
  )
}

function OutletDocPreview({
  outletId, documentId, name, mimeType, open, onOpenChange,
}: {
  outletId: string; documentId: string; name: string | null; mimeType: string | null
  open: boolean; onOpenChange: (o: boolean) => void
}) {
  const { data, isLoading, isError } = useOutletDocumentPreview(outletId, documentId, open)
  const isImage = mimeType?.startsWith("image/")
  const isPdf = mimeType === "application/pdf"
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{name ?? "Document"}</SheetTitle>
          <SheetDescription>Preview only.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 items-center justify-center overflow-hidden px-4 pb-4">
          {isLoading ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          ) : isError || !data?.url ? (
            <p className="text-sm text-muted-foreground">Couldn&apos;t load this document.</p>
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.url} alt={name ?? "Document"} className="max-h-full max-w-full rounded-lg object-contain" />
          ) : isPdf ? (
            <iframe src={data.url} title={name ?? "Document"} className="h-full w-full rounded-lg border border-border" />
          ) : (
            <a href={data.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary underline">Open document</a>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
