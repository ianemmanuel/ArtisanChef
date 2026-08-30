"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { clientFetch } from "@/lib/api/client"
import type {
  OutletDocumentStatusRow,
  PresignUploadRequest,
  PresignUploadResponse,
  UpsertOutletDocumentRequest,
  UpsertOutletDocumentResponse,
} from "@repo/types/vendor-app"

/*
 * OUTLET-scoped document hooks — the per-location counterpart to
 * lib/queries/account-documents.ts. Every hook is parametrised by outletId
 * (account documents resolve the vendor from auth; an outlet needs to be
 * named). No delete — same "replace, never delete" design.
 */

export const outletDocumentKeys = {
  status: (outletId: string) => ["outletDocuments", outletId, "status"] as const,
}

export function useOutletDocumentStatus(outletId: string) {
  return useQuery({
    queryKey: outletDocumentKeys.status(outletId),
    queryFn : () => clientFetch<OutletDocumentStatusRow[]>(`/api/outlets/${outletId}/documents/status`),
  })
}

export function usePresignOutletUpload(outletId: string) {
  return useMutation({
    mutationFn: (input: PresignUploadRequest) =>
      clientFetch<PresignUploadResponse>(`/api/outlets/${outletId}/documents/presign`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
  })
}

export function useUpsertOutletDocument(outletId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertOutletDocumentRequest) =>
      clientFetch<UpsertOutletDocumentResponse>(`/api/outlets/${outletId}/documents/upsert`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outletDocumentKeys.status(outletId) })
      queryClient.invalidateQueries({ queryKey: ["outlet", outletId] })
    },
  })
}

export function useOutletDocumentPreview(outletId: string, documentId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["outletDocuments", outletId, "preview", documentId],
    queryFn : () => clientFetch<{ url: string }>(`/api/outlets/${outletId}/documents/${documentId}/preview`),
    enabled : enabled && Boolean(documentId),
    staleTime: 0,
    gcTime  : 0,
  })
}
