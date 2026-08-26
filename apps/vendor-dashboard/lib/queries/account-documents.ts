"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { clientFetch } from "@/lib/api/client"
import type {
  VendorAccountDocumentStatusRow,
  PresignUploadRequest,
  PresignUploadResponse,
  UpsertAccountDocumentRequest,
  UpsertAccountDocumentResponse,
} from "@repo/types/vendor-app"

/*
 * Roadmap "Vendor document remediation" (CLAUDE.md, 2026-08-26) — the
 * account-level counterpart to lib/queries/onboarding.ts's document
 * hooks. Deliberately separate: different endpoints, different response
 * shape (VendorAccountDocumentStatusRow's richer actionStatus vs. a
 * bare uploaded/not-uploaded flag), and no delete — an account document
 * is replaced (a new version, old one superseded), never deleted, since
 * it may already have compliance history attached to it.
 */

export const accountDocumentKeys = {
  status: ["accountDocuments", "status"] as const,
}

export function useAccountDocumentStatus() {
  return useQuery({
    queryKey: accountDocumentKeys.status,
    queryFn : () => clientFetch<VendorAccountDocumentStatusRow[]>("/api/account-documents/status"),
  })
}

export function usePresignAccountUpload() {
  return useMutation({
    mutationFn: (input: PresignUploadRequest) =>
      clientFetch<PresignUploadResponse>("/api/account-documents/presign", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  })
}

export function useUpsertAccountDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertAccountDocumentRequest) =>
      clientFetch<UpsertAccountDocumentResponse>("/api/account-documents/upsert", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountDocumentKeys.status })
    },
  })
}
