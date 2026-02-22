const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token: string
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })

    const json = await res.json()

    if (!res.ok) {
      return { data: null, error: json.message || "Something went wrong" }
    }

    return { data: json.data ?? json, error: null }
  } catch {
    return { data: null, error: "Network error. Please try again." }
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"

export interface Country {
  id: string
  name: string
  code: string
  currency: string
  phoneCode: string
  currencySymbol: string | null
}

export interface VendorType {
  id: string
  name: string
  description: string | null
}

export interface VendorDocument {
  id: string
  applicationId: string
  documentTypeId: string
  documentName: string | null
  storageKey: string
  fileSize: number | null
  mimeType: string | null
  documentNumber: string | null
  issueDate: string | null
  expiryDate: string | null
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "SUPERSEDED" | "WITHDRAWN"
  uploadedAt: string
}

export interface Application {
  id: string
  userId: string
  countryId: string
  vendorTypeId: string
  otherVendorType: string | null
  legalBusinessName: string
  registrationNumber: string | null
  taxId: string | null
  businessEmail: string
  businessPhone: string | null
  ownerFirstName: string
  ownerLastName: string
  ownerPhone: string | null
  ownerEmail: string | null
  businessAddress: string
  addressLine2: string | null
  postalCode: string | null
  status: ApplicationStatus
  submittedAt: string | null
  createdAt: string
  country?: Country
  vendorType?: VendorType
  documents?: VendorDocument[]
}

export interface DocumentRequirement {
  documentTypeId: string
  name: string
  isRequired: boolean
  uploaded: boolean
  uploadedDocument: VendorDocument | null
}

export interface UploadProgress {
  requiredTotal: number
  uploadedRequired: number
  uploadedTotal: number
  isComplete: boolean
  percentage: number
}

export interface ApplicationPreview {
  application: Application
  requirements: DocumentRequirement[]
  progress: UploadProgress
  missingRequired: string[]
  canSubmit: boolean
}

// ─── Application ─────────────────────────────────────────────────────────────

export async function getApplication(token: string) {
  return apiFetch<Application>("/vendor/onboarding/application", {}, token)
}

export async function upsertApplication(
  token: string,
  data: {
    countryId: string
    vendorTypeId: string
    otherVendorType?: string
    legalBusinessName: string
    registrationNumber?: string
    taxId?: string
    businessEmail: string
    businessPhone?: string
    ownerFirstName: string
    ownerLastName: string
    ownerPhone?: string
    ownerEmail?: string
    businessAddress: string
    addressLine2?: string
    postalCode?: string
  }
) {
  return apiFetch<Application>("/vendor/onboarding/application", {
    method: "POST",
    body: JSON.stringify(data),
  }, token)
}

export async function getApplicationPreview(token: string, applicationId: string) {
  return apiFetch<ApplicationPreview>(
    `/vendor/onboarding/application/${applicationId}/preview`,
    {},
    token
  )
}

export async function submitApplication(token: string, applicationId: string) {
  return apiFetch<{ id: string; status: ApplicationStatus }>(
    `/vendor/onboarding/application/${applicationId}/submit`,
    { method: "POST" },
    token
  )
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function getDocumentRequirements(token: string, applicationId: string) {
  return apiFetch<{ application: Partial<Application>; requirements: DocumentRequirement[]; progress: UploadProgress }>(
    `/vendor/onboarding/documents/${applicationId}`,
    {},
    token
  )
}

export async function presignUpload(
  token: string,
  data: { fileName: string; fileType: string; applicationId: string; documentTypeId: string }
) {
  return apiFetch<{ uploadUrl: string; storageKey: string }>(
    "/vendor/onboarding/documents/presign",
    { method: "POST", body: JSON.stringify(data) },
    token
  )
}

export async function upsertDocument(
  token: string,
  data: {
    applicationId: string
    documentTypeId: string
    storageKey: string
    documentName?: string
    fileSize?: number
    mimeType?: string
    documentNumber?: string
    issueDate?: string
    expiryDate?: string
  }
) {
  return apiFetch<{ document: VendorDocument; progress: UploadProgress }>(
    "/vendor/onboarding/documents",
    { method: "POST", body: JSON.stringify(data) },
    token
  )
}

export async function deleteDocument(token: string, documentId: string) {
  return apiFetch<{ progress: UploadProgress }>(
    `/vendor/onboarding/documents/${documentId}`,
    { method: "DELETE" },
    token
  )
}

export async function getDocumentViewUrl(token: string, documentId: string) {
  return apiFetch<{ url: string }>(
    `/vendor/onboarding/documents/${documentId}/preview`,
    {},
    token
  )
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export async function getOnboardingCountries(token: string) {
  return apiFetch<{ countries: Country[] }>("/meta/onboarding/countries", {}, token)
}

export async function getOnboardingVendorTypes(token: string, countryId: string) {
  return apiFetch<{ vendorTypes: VendorType[] }>(
    `/meta/onboarding/vendor-types?countryId=${countryId}`,
    {},
    token
  )
}

// ─── R2 direct upload ────────────────────────────────────────────────────────

export async function uploadFileToR2(uploadUrl: string, file: File): Promise<boolean> {
  try {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    })
    return res.ok
  } catch {
    return false
  }
}