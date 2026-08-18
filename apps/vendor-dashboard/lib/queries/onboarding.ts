"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { clientFetch } from "@/lib/api/client"
import type { ApplicationPreview } from "@/lib/api/types"
import type {
  VendorSessionData,
  Country,
  VendorType,
  VendorApplicationDetail,
  CreateVendorApplicationRequest,
  UpdateVendorApplicationRequest,
  ChangeVendorApplicationScopeRequest,
  DocumentRequirementsResponse,
  PresignUploadRequest,
  PresignUploadResponse,
  UpsertDocumentRequest,
  UpsertDocumentResponse,
  DocumentProgress,
} from "@repo/types/vendor-app"

export const onboardingKeys = {
  session: ["onboarding", "session"] as const,
  countries: ["onboarding", "countries"] as const,
  vendorTypes: (countryId: string | undefined) => ["onboarding", "vendorTypes", countryId] as const,
  application: ["onboarding", "application"] as const,
  preview: ["onboarding", "preview"] as const,
  documentRequirements: ["onboarding", "documentRequirements"] as const,
}

//* ─── Reads ───────────────────────────────────────────────────────────────

export function useVendorSession(initialData?: VendorSessionData) {
  return useQuery({
    queryKey: onboardingKeys.session,
    queryFn: () => clientFetch<VendorSessionData>("/api/onboarding/session"),
    initialData,
  })
}

export function useCountries() {
  return useQuery({
    queryKey: onboardingKeys.countries,
    queryFn: () => clientFetch<{ countries: Country[] }>("/api/onboarding/countries"),
    // Reference/config data — activation is an infrequent admin action.
    staleTime: 5 * 60_000,
    select: (data) => data.countries,
  })
}

export function useVendorTypes(countryId: string | undefined) {
  return useQuery({
    queryKey: onboardingKeys.vendorTypes(countryId),
    queryFn: () =>
      clientFetch<{ vendorTypes: VendorType[] }>(
        `/api/onboarding/vendor-types?countryId=${encodeURIComponent(countryId!)}`,
      ),
    enabled: Boolean(countryId),
    staleTime: 5 * 60_000,
    select: (data) => data.vendorTypes,
  })
}

export function useApplication(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: onboardingKeys.application,
    queryFn: () => clientFetch<VendorApplicationDetail>("/api/onboarding/application"),
    enabled: options?.enabled,
    retry: false,
  })
}

export function useApplicationPreview(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: onboardingKeys.preview,
    queryFn: () => clientFetch<ApplicationPreview>("/api/onboarding/application/preview"),
    enabled: options?.enabled,
  })
}

export function useDocumentRequirements(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: onboardingKeys.documentRequirements,
    queryFn: () => clientFetch<DocumentRequirementsResponse>("/api/onboarding/documents"),
    enabled: options?.enabled,
  })
}

// Presigned view URLs expire (R2_VIEW_EXPIRY_SECONDS) — always refetch a
// fresh one rather than reusing a cached, possibly-expired link.
export function useDocumentPreview(documentId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["onboarding", "documentPreview", documentId],
    queryFn: () => clientFetch<{ url: string }>(`/api/onboarding/documents/${documentId}`),
    enabled: enabled && Boolean(documentId),
    staleTime: 0,
    gcTime: 0,
  })
}

//* ─── Mutations ──────────────────────────────────────────────────────────

export function useCreateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateVendorApplicationRequest) =>
      clientFetch<VendorApplicationDetail>("/api/onboarding/application", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (application) => {
      queryClient.setQueryData(onboardingKeys.application, application)
      queryClient.invalidateQueries({ queryKey: onboardingKeys.session })
    },
  })
}

export function useUpdateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateVendorApplicationRequest) =>
      clientFetch<VendorApplicationDetail>("/api/onboarding/application", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (application) => {
      queryClient.setQueryData(onboardingKeys.application, application)
      queryClient.invalidateQueries({ queryKey: onboardingKeys.preview })
      queryClient.invalidateQueries({ queryKey: onboardingKeys.session })
    },
  })
}

export function useChangeApplicationScope() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ChangeVendorApplicationScopeRequest) =>
      clientFetch<{ application: VendorApplicationDetail; documentsCleared: boolean }>(
        "/api/onboarding/application/scope",
        { method: "PATCH", body: JSON.stringify(input) },
      ),
    onSuccess: ({ application }) => {
      queryClient.setQueryData(onboardingKeys.application, application)
      queryClient.invalidateQueries({ queryKey: onboardingKeys.preview })
      queryClient.invalidateQueries({ queryKey: onboardingKeys.documentRequirements })
      queryClient.invalidateQueries({ queryKey: onboardingKeys.session })
    },
  })
}

export function useSubmitApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      clientFetch<{ id: string; status: string }>("/api/onboarding/application/submit", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.session })
      queryClient.invalidateQueries({ queryKey: onboardingKeys.application })
    },
  })
}

export function usePresignUpload() {
  return useMutation({
    mutationFn: (input: PresignUploadRequest) =>
      clientFetch<PresignUploadResponse>("/api/onboarding/documents/presign", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  })
}

export function useUpsertDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertDocumentRequest) =>
      clientFetch<UpsertDocumentResponse>("/api/onboarding/documents/upsert", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.documentRequirements })
      queryClient.invalidateQueries({ queryKey: onboardingKeys.preview })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) =>
      clientFetch<{ progress: DocumentProgress }>(`/api/onboarding/documents/${documentId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.documentRequirements })
      queryClient.invalidateQueries({ queryKey: onboardingKeys.preview })
    },
  })
}
