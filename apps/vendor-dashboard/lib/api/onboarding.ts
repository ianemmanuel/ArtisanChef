import { BusinessDetailsFormData } from "@/lib/validations/onboarding"
import { VendorApplication, VendorDocument } from "@repo/types"

//* =======================APPLICATION============================

export async function upsertApplication(
  payload: BusinessDetailsFormData
): Promise<{
  application: VendorApplication
  message: string
}> {
  const res = await fetch("/api/onboarding/application", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const json = await res.json()

  if (!res.ok) {
    throw new Error(json?.message ?? "Failed to save application")
  }

  return json
}

//* =====================PRESIGN UPLOAD=========================

export async function uploadFileToStorage(
  file: File,
  applicationId: string,
  documentTypeId: string
): Promise<{ storageKey?: string; error?: string }> {
  try {
    const presignRes = await fetch("/api/onboarding/documents/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId,
        documentTypeId,
        fileName: file.name,
        mimeType: file.type,
      }),
    })

    const presignJson = await presignRes.json()

    if (!presignRes.ok) {
      return { error: presignJson?.message || "Failed to get upload URL" }
    }

    const { uploadUrl, storageKey } = presignJson

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    })

    if (!uploadRes.ok) {
      return { error: "File upload failed" }
    }

    return { storageKey }
  } catch {
    return { error: "Unexpected upload error" }
  }
}

//* ====================CONFIRM DOCUMENT=========================

export async function uploadDocument(payload: {
  applicationId: string
  documentTypeId: string
  storageKey: string
  documentName: string
  fileSize: number
  mimeType: string
  documentNumber?: string
  issueDate?: string
  expiryDate?: string
}): Promise<{ data?: any; error?: string }> {
  try {
    const res = await fetch("/api/onboarding/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const json = await res.json()

    if (!res.ok) {
      return { error: json?.message || "Failed to save document" }
    }

    return { data: json }
  } catch {
    return { error: "Unexpected error uploading document" }
  }
}

//* =======================DELETE DOCUMENT========================

export async function deleteDocument(
  documentId: string
): Promise<{ error?: string }> {
  try {
    const res = await fetch(`/api/onboarding/documents/${documentId}`, {
      method: "DELETE",
    })

    const json = await res.json()

    if (!res.ok) {
      return { error: json?.message || "Failed to delete document" }
    }

    return {}
  } catch {
    return { error: "Unexpected delete error" }
  }
}

//* ==================GET DOCUMENT TYPES + PROGRESS=======================

export async function getDocumentTypes(
  applicationId: string
): Promise<{ data?: any; error?: string }> {
  try {
    const res = await fetch(`/api/onboarding/documents/doc-types/${applicationId}`)
    const json = await res.json()

    if (!res.ok) {
      return { error: json?.message || "Failed to fetch documents" }
    }

    return { data: json }
  } catch {
    return { error: "Unexpected fetch error" }
  }
}

//* ===============PREVIEW DOCUMENT (SIGNED GET)=======================

export async function previewDocument(
  documentId: string
): Promise<{ url?: string; error?: string }> {
  try {
    const res = await fetch(`/api/documents/${documentId}/preview`)
    const json = await res.json()

    if (!res.ok) {
      return { error: json?.message || "Failed to preview document" }
    }

    return { url: json.url }
  } catch {
    return { error: "Unexpected preview error" }
  }
}
