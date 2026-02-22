"use client"

import { useState } from "react"
import { DocumentsHeader } from "./DocumentsHeader"
import { DocumentCard } from "./DocumentCard"
import { Alert, AlertDescription } from "@repo/ui/components/alert"
import { toast } from "sonner"

//!const API_URL = process.env.NEXT_PUBLIC_API_URL!

interface BackendDocument {
  id: string
  documentName: string | null
  documentTypeId: string
  storageKey: string
  mimeType: string | null
  status: string
}

interface Requirement {
  documentTypeId: string
  name: string
  isRequired: boolean
  uploaded: boolean
  uploadedDocument: BackendDocument | null
}

interface Progress {
  requiredTotal: number
  uploadedRequired: number
  uploadedTotal: number
  isComplete: boolean
  percentage: number
}

interface Props {
  requirements: Requirement[]
  initialProgress: Progress
  applicationId: string
}

export function DocumentsForm({
  requirements: initialRequirements,
  initialProgress,
  applicationId,
}: Props) {
  const [requirements, setRequirements] =
    useState<Requirement[]>(initialRequirements)

  const [progress, setProgress] =
    useState<Progress>(initialProgress)

  const [uploadingId, setUploadingId] =
    useState<string | null>(null)

  const [deletingId, setDeletingId] =
    useState<string | null>(null)

  const [error, setError] =
    useState<string | null>(null)

  async function handleUpload(req: Requirement, file: File) {
    try {
      setError(null)
      setUploadingId(req.documentTypeId)

      // 1️⃣ Presign
      const presignRes = await fetch(
        `/api/onboarding/documents/presign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId,
            documentTypeId: req.documentTypeId,
            fileName: file.name,
            mimeType: file.type,
          }),
        }
      )

      const presignJson = await presignRes.json()

      if (!presignRes.ok || presignJson.status !== "success") {
        setError(presignJson.message)
        return
      }

      const { uploadUrl, storageKey } = presignJson.data

      // 2️⃣ Upload to R2
      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })

      // 3️⃣ Save document record
      const upsertRes = await fetch(
        `api/onboarding/documents/upsert`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId,
            documentTypeId: req.documentTypeId,
            storageKey,
            documentName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          }),
        }
      )

      const upsertJson = await upsertRes.json()

      if (!upsertRes.ok || upsertJson.status !== "success") {
        setError(upsertJson.message)
        return
      }

      const { document, progress } = upsertJson.data

      setRequirements(prev =>
        prev.map(r =>
          r.documentTypeId === req.documentTypeId
            ? {
                ...r,
                uploaded: true,
                uploadedDocument: document,
              }
            : r
        )
      )

      setProgress(progress)
      toast.success("Document uploaded")
    } catch {
      setError("Upload failed")
    } finally {
      setUploadingId(null)
    }
  }

  async function handleDelete(req: Requirement) {
    if (!req.uploadedDocument) return

    try {
      setError(null)
      setDeletingId(req.documentTypeId)

      const res = await fetch(
        `/api/onboarding/documents/${req.uploadedDocument.id}`,
        { method: "DELETE" }
      )

      const json = await res.json()

      if (!res.ok || json.status !== "success") {
        setError(json.message)
        return
      }

      setRequirements(prev =>
        prev.map(r =>
          r.documentTypeId === req.documentTypeId
            ? { ...r, uploaded: false, uploadedDocument: null }
            : r
        )
      )

      setProgress(json.data.progress)
      toast.success("Document deleted")
    } catch {
      setError("Delete failed")
    } finally {
      setDeletingId(null)
    }
  }

  async function handlePreview(doc: BackendDocument) {
    const res = await fetch(
      `/api/onboarding/documents/${doc.id}`,
       { method: "GET" }
    )

    const json = await res.json()

    if (res.ok && json.status === "success") {
      window.open(json.data.url, "_blank")
    } else {
      toast.error("Preview failed")
    }
  }

  return (
    <div className="space-y-6">
      <DocumentsHeader progress={progress.percentage} />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {requirements.map(req => (
          <DocumentCard
            key={req.documentTypeId}
            req={req}
            uploading={uploadingId === req.documentTypeId}
            deleting={deletingId === req.documentTypeId}
            onUpload={handleUpload}
            onDelete={handleDelete}
            onPreview={handlePreview}
          />
        ))}
      </div>
    </div>
  )
}