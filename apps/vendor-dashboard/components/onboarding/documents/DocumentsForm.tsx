"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { DocumentsHeader } from "./DocumentsHeader"
import { DocumentCard } from "./DocumentCard"
import { Alert, AlertDescription } from "@repo/ui/components/alert"
import { Button } from "@repo/ui/components/button"
import { toast } from "sonner"

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

export function DocumentsForm({ requirements: initialRequirements, initialProgress, applicationId }: Props) {
  const router = useRouter()
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements)
  const [progress, setProgress] = useState<Progress>(initialProgress)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(req: Requirement, file: File) {
    try {
      setError(null)
      setUploadingId(req.documentTypeId)

      // 1️⃣ Get presigned upload URL from our Next.js route handler
      const presignRes = await fetch("/api/onboarding/documents/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          documentTypeId: req.documentTypeId,
          fileName: file.name,
          fileType: file.type,   // matches presignUpload controller: const { fileType }
        }),
      })

      const presignJson = await presignRes.json()

      if (!presignRes.ok || presignJson.status !== "success") {
        const message = presignRes.status < 500
          ? presignJson.message || "Failed to prepare upload"
          : "Something went wrong. Please try again."
        console.error("[DocumentsForm] presign error:", presignJson)
        setError(message)
        return
      }

      const { uploadUrl, storageKey } = presignJson.data

      // 2️⃣ Upload directly to R2 using the presigned URL
      const r2Res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })

      if (!r2Res.ok) {
        console.error("[DocumentsForm] R2 upload failed", r2Res.status)
        setError("File upload failed. Please try again.")
        return
      }

      // 3️⃣ Save the document record in our DB
      const upsertRes = await fetch("/api/onboarding/documents/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          documentTypeId: req.documentTypeId,
          storageKey,
          documentName: file.name,
          fileSize: file.size,
          mimeType: file.type,   // matches upsertDocument controller: const { mimeType }
        }),
      })

      const upsertJson = await upsertRes.json()

      if (!upsertRes.ok || upsertJson.status !== "success") {
        const message = upsertRes.status < 500
          ? upsertJson.message || "Failed to save document"
          : "Something went wrong. Please try again."
        console.error("[DocumentsForm] upsert error:", upsertJson)
        setError(message)
        return
      }

      const { document, progress: newProgress } = upsertJson.data

      setRequirements(prev =>
        prev.map(r =>
          r.documentTypeId === req.documentTypeId
            ? { ...r, uploaded: true, uploadedDocument: document }
            : r
        )
      )
      setProgress(newProgress)
      toast.success("Document uploaded successfully")
    } catch (err) {
      console.error("[DocumentsForm] upload unexpected error:", err)
      setError("Something went wrong. Please try again.")
    } finally {
      setUploadingId(null)
    }
  }

  async function handleDelete(req: Requirement) {
    if (!req.uploadedDocument) return

    try {
      setError(null)
      setDeletingId(req.documentTypeId)

      const res = await fetch(`/api/onboarding/documents/${req.uploadedDocument.id}`, {
        method: "DELETE",
      })

      const json = await res.json()

      if (!res.ok || json.status !== "success") {
        const message = res.status < 500
          ? json.message || "Failed to delete document"
          : "Something went wrong. Please try again."
        console.error("[DocumentsForm] delete error:", json)
        setError(message)
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
      toast.success("Document removed")
    } catch (err) {
      console.error("[DocumentsForm] delete unexpected error:", err)
      setError("Something went wrong. Please try again.")
    } finally {
      setDeletingId(null)
    }
  }

  async function handlePreview(doc: BackendDocument) {
    try {
      const res = await fetch(`/api/onboarding/documents/${doc.id}`, { method: "GET" })
      const json = await res.json()

      if (res.ok && json.status === "success") {
        window.open(json.data.url, "_blank")
      } else {
        console.error("[DocumentsForm] preview error:", json)
        toast.error("Could not open document. Please try again.")
      }
    } catch (err) {
      console.error("[DocumentsForm] preview unexpected error:", err)
      toast.error("Could not open document. Please try again.")
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

      {/* Navigation */}
      <div className="flex justify-between border-t pt-6">
        <Button
          variant="outline"
          onClick={() => router.push("/onboarding/business-details")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <Button
          onClick={() => router.push("/onboarding/review")}
          disabled={!progress.isComplete}
          className="bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
        >
          Review & Submit <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}