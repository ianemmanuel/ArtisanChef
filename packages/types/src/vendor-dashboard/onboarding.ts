export enum VendorApplicationStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  REJECTED = "REJECTED",
  APPROVED = "APPROVED",
}

export enum DocumentStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  WITHDRAWN = "WITHDRAWN",
}

export interface Country {
  id: string
  name: string
  code: string
}

export interface VendorType {
  id: string
  name: string
  description?: string
}

export interface DocumentType {
  id: string
  name: string
  description?: string
  required: boolean
  countryId?: string
}

export interface VendorDocument {
  id: string
  applicationId: string
  documentTypeId: string
  storageKey: string
  documentName: string
  fileSize: number
  mimeType: string
  documentNumber?: string
  issueDate?: Date | string
  expiryDate?: Date | string
  status: DocumentStatus
  reviewedAt?: Date | string
  approvedAt?: Date | string
  rejectedAt?: Date | string
  rejectionReason?: string
  revisionNotes?: string
  supersededAt?: Date | string
  createdAt: Date | string
  updatedAt: Date | string
}

export interface VendorApplication {
  id: string
  userId: string
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
  status: VendorApplicationStatus
  rejectionReason?: string
  revisionNotes?: string
  submittedAt?: Date | string
  reviewedAt?: Date | string
  reviewedBy?: string
  createdAt: Date | string
  updatedAt: Date | string
  country: Country
  vendorType: VendorType
  documents: VendorDocument[]
}

export interface OnboardingWizardProps {
  countries: Array<{
    id: string
    name: string
    code: string
  }>
  vendorTypes: Array<{
    id: string
    name: string
    description?: string
  }>
}

export interface BusinessDetailsFormProps {
  countries: Array<{ id: string; name: string; code: string }>
  vendorTypes: Array<{ id: string; name: string; description?: string }>
  onSuccess: () => void
}