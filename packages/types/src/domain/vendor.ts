import { VendorStatus, VendorApplicationStatus, VendorTypeStatus } from "../enums/vendor"
import { GeoStatus } from "../enums/geography"

import { DocumentStatus, DocumentScope, DocumentTypeStatus } from "../enums/document"
import type { Country } from "./country"


export interface VendorUser {
  id       : string
  clerkId  : string
  email    : string
  isActive : boolean
  isDeleted: boolean
  isBanned : boolean
  banReason: string | null
  bannedAt : string | null
  createdAt: string
  updatedAt: string
}

export interface VendorType{
  id : string
  name : string
  description : string | null
  status : VendorTypeStatus
  createdByAdminId : string | null
  deletedAt : string | null
  createdAt : string
  updatedAt : string
}

export interface VendorTypeCountry {
  id : string
  countryId : string
  vendorTypeId : string
  status : GeoStatus
  createdByAdminId : string | null
  createdAt : string
  updatedAt : string
}

//* ─── Admin: vendor type configuration ──────────────────────────────────────

export interface CreateVendorTypeRequest {
  name: string
  description?: string
}

export interface UpdateVendorTypeRequest {
  name?: string
  description?: string
  status?: VendorTypeStatus
}

export interface AssignVendorTypeToCountryRequest {
  countryId: string
  vendorTypeId: string
}

export interface VendorTypeSummary {
  id         : string
  name       : string
  description: string | null
  status     : VendorTypeStatus
  createdAt  : string
  _count     : { countries: number }
}

export interface VendorTypeListResult {
  vendorTypes: VendorTypeSummary[]
  total      : number
  page       : number
  pageSize   : number
  totalPages : number
}

/** Real vendor-account counts for one vendor type, scope-filtered — no revenue (mock, generated on the frontend). */
export interface VendorTypeStats {
  total    : number
  active   : number
  suspended: number
}

//* ─── Admin: document type configuration ────────────────────────────────────
//* Given country X + vendor type Y, DocumentTypeVendorType is the join that
//* answers "what documents must this vendor provide" — see
//* vendor.document.service.ts's getAllowedDocumentTypes, the single
//* consumer both the vendor-facing flow and admin-facing config reuse.

export interface DocumentTypeConfig {
  id : string
  name : string
  code : string
  description : string | null
  scope : DocumentScope
  isInheritable : boolean
  countryId : string
  cityId : string | null
  isRequired : boolean
  requiresExpiry : boolean
  expiryWarningDays : number
  instructions : string | null
  sampleUrl : string | null
  status : DocumentTypeStatus
  createdByAdminId : string | null
  createdAt : string
  updatedAt : string
}

export interface DocumentTypeVendorType {
  id : string
  documentTypeId : string
  vendorTypeId : string
  isRequired : boolean
  createdAt : string
}

export interface CreateDocumentTypeRequest {
  name: string
  code: string
  description?: string
  scope: DocumentScope
  countryId: string
  cityId?: string
  isRequired?: boolean
  requiresExpiry?: boolean
  expiryWarningDays?: number
  instructions?: string
  sampleUrl?: string
}

export interface UpdateDocumentTypeRequest {
  name?: string
  description?: string
  isRequired?: boolean
  requiresExpiry?: boolean
  expiryWarningDays?: number
  instructions?: string
  sampleUrl?: string
  status?: DocumentTypeStatus
}

export interface AssignDocumentTypeToVendorTypeRequest {
  documentTypeId: string
  vendorTypeId: string
  isRequired?: boolean
}

/*
  * Nullability: everything except id/
  * countryId/vendorTypeId/status/timestamps is nullable, to support
  * progressive saving during onboarding — a DRAFT application can
  * legitimately have most fields still unset.
*/
export interface VendorApplication {
  id : string
  userId : string | null
  countryId : string
  vendorTypeId : string
  otherVendorType : string | null
  legalBusinessName : string | null
  registrationNumber: string | null
  taxId : string | null
  businessEmail : string | null
  businessPhone : string | null
  ownerFirstName : string | null
  ownerLastName : string | null
  ownerPhone : string | null
  ownerEmail : string | null
  businessAddress : string | null
  addressLine2 : string | null
  postalCode : string | null
  status : VendorApplicationStatus
  revisionCount : number
  rejectionReason : string | null
  revisionNotes : string | null
  reasonCode : string | null
  submittedAt : string | null
  reviewedAt : string | null
  approvedAt : string | null
  //* Reviewer ownership — see admin.vendor.service.ts's claimApplication/
  //* reassignApplication. Plain ids, not relations (matches this
  //* codebase's admin-actor-reference convention).
  assignedReviewerId : string | null
  assignedAt : string | null
  reviewedById : string | null
  createdAt : string
  updatedAt : string
}

export interface VendorApplicationWithDetails extends VendorApplication {
  vendorType : VendorType
  documents  : VendorDocument[]
  //* Scalar country fields only — matches what `include: { country: true }`
  //* actually returns (no cities/_count relations, unlike domain Country's
  //* full shape used elsewhere for the admin-facing entity).
  country    : Pick<Country, "id" | "name" | "code" | "currency" | "currencySymbol" | "phoneCode">
}

export interface VendorAccount {
  id : string
  userId : string | null
  vendorTypeId : string
  otherVendorType : string | null
  countryId : string
  applicationId : string
  status : VendorStatus
  legalBusinessName : string
  businessEmail : string
  businessPhone : string
  companyRegNumber : string | null
  taxRegistrationNumber : string | null
  taxIdType : string | null
  ownerFirstName : string
  ownerLastName : string
  ownerPhone : string | null
  ownerEmail : string | null
  businessAddress : string
  addressLine2 : string | null
  postalCode : string | null
  addressVerified : boolean
  suspensionReason : string | null
  suspendedAt : string | null
  suspensionUntil : string | null
  deactivatedAt : string | null
  deletedAt : string | null
  createdAt : string
  updatedAt : string
}

export interface VendorAccountWithDetails extends VendorAccount {
  vendorType : VendorType
  vendorProfile : VendorProfile | null
  outlets  : OutletSummary[]
}

//* Vendor profile

export interface VendorProfile {
  id : string
  vendorAccountId : string
  displayName : string
  tagline : string | null
  description : string | null
  logoUrl : string | null
  coverImageUrl : string | null
  publicEmail : string | null
  publicPhone : string | null
  website : string | null
  isVerifiedBadge : boolean
  isTopRated : boolean
  isCommunityFavorite : boolean
  isPublished : boolean
  isFeatured : boolean
  totalReviews : number
  averageRating : number
  publishedAt : string | null
  createdAt : string
  updatedAt : string
}


export interface VendorDocument {
  id : string
  applicationId : string | null
  vendorId : string | null
  documentTypeId  : string
  documentNumber  : string | null
  storageKey : string
  documentName : string | null
  fileSize : number | null
  mimeType : string | null
  issueDate : string | null
  expiryDate : string | null
  status : DocumentStatus
  uploadedAt : string
  reviewedAt : string | null
  approvedAt : string | null
  rejectedAt : string | null
  rejectionReason : string | null
  revisionNotes : string | null
  supersededBy : string | null
  supersededAt : string | null
  version : number
  createdAt : string
  updatedAt : string
}

// Minimal outlet shape used as a relation on VendorAccount
// Full Outlet type lives in outlet.ts
export interface OutletSummary {
  id : string
  name : string
  cityId : string
  adminStatus : string
  isMainStore : boolean
  createdAt   : string
}


/*
  * Vendor lifecycle state — derived server-side from VendorUser +
  * VendorApplication + VendorAccount, never stored directly. This is
  * the ONE field the frontend should switch navigation/UI on.
*/
export type VendorLifecycleState =
  | "NOT_STARTED"     // no VendorApplication row exists yet
  | "DRAFT"           // application exists, status DRAFT
  | "PENDING_REVIEW"  // status SUBMITTED or UNDER_REVIEW
  | "NEEDS_REVISION"  // status NEEDS_REVISION — editable, resubmit flow
  | "REJECTED"        // status REJECTED — terminal, no resubmission
  | "ACTIVE"          // VendorAccount exists and is ACTIVE
  | "SUSPENDED"       // VendorAccount exists and is SUSPENDED
  | "BANNED"          // VendorAccount exists and is BANNED

/*
  * GET /api/vendor/v1/auth/session response shape.
  * application/vendorAccount are the SLIM shapes loadVendorContext
  * actually loads — not the richer VendorApplicationWithDetails/
  * VendorAccountWithDetails used by the dedicated GET /application
  * and GET /vendor-account endpoints.
*/

export interface VendorSessionApplication {
  id              : string
  status          : VendorApplicationStatus
  countryId       : string
  vendorTypeId    : string
  submittedAt     : string | null
  reviewedAt      : string | null
  approvedAt      : string | null
  rejectionReason : string | null
  revisionNotes   : string | null
  reasonCode      : string | null
}

export interface VendorSessionAccount {
  id                : string
  status            : VendorStatus
  countryId         : string
  vendorTypeId      : string
  legalBusinessName : string
  suspensionReason  : string | null
  suspendedAt       : string | null
  suspensionUntil   : string | null
}

export interface VendorSessionData {
  state         : VendorLifecycleState
  vendorUser    : {
    id       : string
    email    : string
    isActive : boolean
    // Present regardless of state — the frontend's BANNED screen
    // needs banReason without a second call, same reasoning as
    // rejectionReason/revisionNotes below.
    isBanned : boolean
    banReason: string | null
    bannedAt : string | null
  }
  application   : VendorSessionApplication | null
  vendorAccount : VendorSessionAccount | null
}


/*
  * Vendor application API contracts
  * These match the existing vendor onboarding routes.
  * Captured here so frontend apps import from @repo/types, not from each other.

  * GET /api/vendor/v1/application
*/
export interface ApplicationResponse {
  id                : string
  status            : VendorApplicationStatus
  countryId         : string
  vendorTypeId      : string
  otherVendorType   : string | null
  legalBusinessName : string | null
  registrationNumber: string | null
  taxId             : string | null
  businessEmail     : string | null
  businessPhone     : string | null
  ownerFirstName    : string | null
  ownerLastName     : string | null
  ownerPhone        : string | null
  ownerEmail        : string | null
  businessAddress   : string | null
  addressLine2      : string | null
  postalCode        : string | null
  rejectionReason   : string | null
  revisionNotes     : string | null
  submittedAt       : string | null
  documents         : ApplicationDocumentSummary[]
}

export interface ApplicationDocumentSummary {
  id             : string
  documentTypeId : string
  documentName   : string | null
  status         : DocumentStatus
}

/*
  * POST /api/vendor/v1/application — starts the application. Deliberately
  * tiny: just enough to know which requirements to show next. Matches
  * createApplicationSchema in the backend.
*/
export interface CreateVendorApplicationRequest {
  countryId        : string
  vendorTypeId     : string
  otherVendorType? : string
}

/*
  * PATCH /api/vendor/v1/application — every subsequent form page saves
  * its own slice. Every field optional at this layer; format-validated
  * when present. Matches updateApplicationSchema in the backend.
*/

export interface UpdateVendorApplicationRequest {
  legalBusinessName?  : string
  registrationNumber? : string
  taxId?              : string
  businessEmail?      : string
  businessPhone?      : string
  ownerFirstName?     : string
  ownerLastName?      : string
  ownerPhone?         : string
  ownerEmail?         : string
  businessAddress?    : string
  addressLine2?       : string
  postalCode?         : string
}

/*
  * PATCH /api/vendor/v1/application/scope — separate, destructive
  * action (clears uploaded documents), DRAFT-only. Same shape as
  * create. Matches changeApplicationScopeSchema in the backend.
*/
export type ChangeVendorApplicationScopeRequest = CreateVendorApplicationRequest

/*
  * GET /api/vendor/v1/documents — requirements + progress for the
  * caller's own application. No :applicationId param — resolved
  * server-side, a vendor only ever has one application.
*/

export interface DocumentRequirement {
  documentTypeId : string
  name           : string
  isRequired     : boolean
  uploaded       : boolean
  uploadedDocument: UploadedDocumentInfo | null
}

export interface UploadedDocumentInfo {
  id            : string
  documentName  : string | null
  documentTypeId: string
  storageKey    : string
  mimeType      : string | null
  status        : DocumentStatus
}

export interface DocumentRequirementsResponse {
  requirements : DocumentRequirement[]
  progress     : DocumentProgress
}

export interface DocumentProgress {
  requiredTotal    : number
  uploadedRequired : number
  uploadedTotal    : number
  isComplete       : boolean
  percentage       : number
}

/*
  * POST /api/vendor/v1/documents/presign — applicationId removed,
  * resolved server-side from the authenticated vendor's own application.
*/

export interface PresignUploadRequest {
  documentTypeId : string
  fileName       : string
  fileType       : string
}

export interface PresignUploadResponse {
  uploadUrl  : string
  storageKey : string
}

//* POST /api/vendor/v1/documents — applicationId removed, same reason.

export interface UpsertDocumentRequest {
  documentTypeId : string
  storageKey     : string
  documentName   : string
  fileSize       : number
  mimeType       : string
}

export interface UpsertDocumentResponse {
  document : UploadedDocumentInfo
  progress : DocumentProgress
}

/*
 * Roadmap "Vendor document remediation" (CLAUDE.md, 2026-08-26) — the
 * account-level (post-approval) counterpart to DocumentRequirementsResponse
 * above, which is application-scoped only. Reuses PresignUploadRequest/
 * Response as-is for the presign step (identical shape) — only the
 * upsert/status shapes differ, since account-level documents carry
 * version history and richer status than a DRAFT application ever needs.
 */
export type VendorDocumentActionStatus =
  | "MISSING"        // required, nothing currently uploaded
  | "NOT_UPLOADED"    // optional, nothing currently uploaded
  | "PENDING_REVIEW"
  | "APPROVED"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "REJECTED"

export interface VendorAccountDocumentStatusRow {
  documentTypeId  : string
  documentTypeName: string
  isRequired      : boolean
  requiresExpiry  : boolean
  instructions    : string | null
  sampleUrl       : string | null
  actionStatus    : VendorDocumentActionStatus
  currentDocument : {
    id             : string
    documentTypeId : string
    status         : DocumentStatus
    documentName   : string | null
    mimeType       : string | null
    issueDate      : string | null
    expiryDate     : string | null
    rejectionReason: string | null
    revisionNotes  : string | null
    uploadedAt     : string
    version        : number
  } | null
}

export interface UpsertAccountDocumentRequest {
  documentTypeId : string
  storageKey     : string
  documentName?  : string
  fileSize?      : number
  mimeType?      : string
  documentNumber?: string
  issueDate?     : string
  expiryDate?    : string
}

export interface UpsertAccountDocumentResponse {
  id            : string
  documentTypeId: string
  status        : DocumentStatus
  version       : number
}


export interface CreateOutletRequest {
  name         : string
  addressLine1 : string
  addressLine2?: string
  cityId       : string
  neighborhood?: string
  postalCode?  : string
  latitude     : number
  longitude    : number
  phone?       : string
  email?       : string
  bio?         : string
  deliveryRadius? : number
  minimumOrder?   : number
  deliveryFee?    : number
}

export interface UpdateOutletRequest {
  name?        : string
  addressLine1?: string
  addressLine2?: string
  neighborhood?: string
  postalCode?  : string
  phone?       : string
  email?       : string
  bio?         : string
  deliveryRadius? : number
  minimumOrder?   : number
  deliveryFee?    : number
  // Coordinates may change if vendor corrects a pin — re-runs coordinate check
  latitude?    : number
  longitude?   : number
}

export interface OperatingHoursEntry {
  dayOfWeek : "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY"
  openTime  : string  // "08:00"
  closeTime : string 
  isClosed  : boolean
}

export interface AddPayoutAccountRequest {
  countryPaymentMethodId: string
  accountHolderName     : string
  // Mobile money
  mobileNetwork?  : string
  mobileNumber?   : string
  // Bank
  bankName?       : string
  branchName?     : string
  bankCode?       : string
  accountNumber?  : string
  swiftCode?      : string
  iban?           : string
  routingNumber?  : string
  // Digital wallets
  paypalEmail?    : string
  stripeAccountId?: string
}

export type idParam = { id: string }