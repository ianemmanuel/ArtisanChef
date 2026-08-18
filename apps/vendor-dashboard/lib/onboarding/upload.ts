//* Mirrors the backend's actual constraints exactly (ALLOWED_MIME_TYPES /
//* MAX_FILE_SIZE_BYTES in vendor.document.service.ts) — this is UX only,
//* the backend re-validates and remains authoritative.
export const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return "Unsupported file type — upload a PDF, JPEG, PNG, or WebP."
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "File is too large — the maximum size is 10MB."
  }
  return null
}

/*
 * PUT directly to the R2 presigned URL with real upload progress —
 * fetch() has no upload-progress event, so this uses XHR specifically
 * for that. The backend never sees these bytes; it only ever receives
 * the resulting storageKey via the upsert call.
 */
export function uploadToPresignedUrl(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", file.type)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error("Upload failed — please try again."))
    }
    xhr.onerror = () => reject(new Error("Upload failed — check your connection and try again."))

    xhr.send(file)
  })
}
