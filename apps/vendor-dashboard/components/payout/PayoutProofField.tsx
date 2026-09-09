"use client"

import * as React from "react"
import { toast } from "sonner"
import { FileText, Loader2, Upload, CheckCircle2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { validateFile, uploadToPresignedUrl, ALLOWED_MIME_TYPES } from "@/lib/onboarding/upload"
import { usePresignPayoutProof } from "@/lib/queries/payout"
import { ClientApiError } from "@/lib/api/client"
import type { PayoutProofDocumentType } from "@repo/types/vendor-app"

/*
 * Proof of bank-account ownership — the MANUAL verification path, shown only
 * where the vendor's country has no provider that can resolve a bank account
 * (Kenya today). Follows what marketplaces operating in those markets ask
 * for: a stamped bank confirmation letter or a recent statement showing the
 * account holder's name and number.
 *
 * Reuses the app's one upload pipeline verbatim — validateFile -> presign ->
 * PUT to R2 with progress -> hand the storageKey back. Nothing new: the
 * storageKey is submitted with the payout account itself, so the account and
 * its proof are created in a single transaction server-side.
 */

export interface PayoutProofValue {
  documentTypeId: string
  storageKey    : string
  documentName  : string
  fileSize      : number
  mimeType      : string
}

interface Props {
  documentType: PayoutProofDocumentType
  /** Decides the storage folder — payout-docs/<method>/<vendorId>/… */
  countryPaymentMethodId: string
  value       : PayoutProofValue | null
  onChange    : (value: PayoutProofValue | null) => void
  error?      : string
}

export function PayoutProofField({ documentType, countryPaymentMethodId, value, onChange, error }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [progress, setProgress] = React.useState<number | null>(null)
  const presign = usePresignPayoutProof()
  const isUploading = progress !== null

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file after a failure
    if (!file) return

    const validationError = validateFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setProgress(0)
    try {
      const { uploadUrl, storageKey } = await presign.mutateAsync({
        countryPaymentMethodId,
        documentTypeId: documentType.id,
        fileName      : file.name,
        fileType      : file.type,
      })
      await uploadToPresignedUrl(uploadUrl, file, setProgress)

      onChange({
        documentTypeId: documentType.id,
        storageKey,
        documentName  : file.name,
        fileSize      : file.size,
        mimeType      : file.type,
      })
      toast.success("Document attached")
    } catch (err) {
      // Surface the real reason. A ClientApiError carries the backend's own
      // message; a plain Error from the upload step carries the storage HTTP
      // status. Collapsing both into a generic string hides exactly the
      // detail needed to tell a config problem from a transient one.
      toast.error(
        err instanceof ClientApiError || err instanceof Error
          ? err.message
          : "Upload failed — please try again.",
      )
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="payout-proof">{documentType.name}</Label>

      <p className="text-xs text-muted-foreground">
        {documentType.instructions ??
          documentType.description ??
          "Upload a document from your bank showing the account holder's name and account number."}
      </p>

      <input
        ref={inputRef}
        id="payout-proof"
        type="file"
        className="hidden"
        accept={ALLOWED_MIME_TYPES.join(",")}
        onChange={handleFileSelect}
        disabled={isUploading}
      />

      {value ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
          <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm">{value.documentName}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            aria-label="Remove attached document"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {isUploading ? "Uploading…" : "Choose file"}
          <FileText className="ml-auto size-4 text-muted-foreground" aria-hidden />
        </Button>
      )}

      {isUploading && <Progress value={progress ?? 0} className="h-1" />}
      {error && !isUploading && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">PDF, JPEG, PNG or WebP — up to 10MB.</p>
    </div>
  )
}
