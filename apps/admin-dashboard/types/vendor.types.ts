// Frontend-local types for the vendors module.
// These mirror the actual backend response shapes (Prisma-relation
// `include`s, not the aspirational packages/types domain model) — they
// live here because they're response DTOs specific to how this frontend's
// list/detail endpoints are actually queried, not shared domain concepts.
// Status/enum values and request contracts that genuinely are shared
// (VendorApplicationStatus, DocumentStatus, AdminActionReason, reject and
// needs-revision requests) come from @repo/types/admin-app instead.

import type { VendorApplicationStatus, DocumentStatus } from "@repo/types/admin-app"

export interface Doc {
  id          : string
  documentName: string | null
  storageKey  : string
  mimeType    : string | null
  status      : DocumentStatus
  expiryDate  : string | null
  documentType: { name: string }
}

export type ViewerState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "ready"; url: string }
  | { type: "error"; message: string }


export interface VendorApplicationListItem {
  id                : string
  legalBusinessName : string
  businessEmail     : string
  ownerFirstName    : string
  ownerLastName     : string
  status            : VendorApplicationStatus
  submittedAt       : string | null
  createdAt         : string
  revisionCount     : number
  countryId         : string
  country?          : { id: string; name: string; code: string }
  vendorType?       : { id: string; name: string }
  _count?           : { documents: number }
}

// What GET /admin/v1/vendors/applications/:id actually returns —
// full VendorApplication row + country/vendorType/documents relations.
export interface ApplicationDetail {
  id                : string
  legalBusinessName : string | null
  businessEmail     : string | null
  businessPhone     : string | null
  ownerFirstName    : string | null
  ownerLastName     : string | null
  ownerEmail        : string | null
  ownerPhone        : string | null
  registrationNumber: string | null
  taxId             : string | null
  businessAddress   : string | null
  addressLine2      : string | null
  postalCode        : string | null
  status            : VendorApplicationStatus
  submittedAt       : string | null
  revisionCount     : number
  rejectionReason   : string | null
  revisionNotes     : string | null
  reasonCode        : string | null
  assignedReviewerId: string | null
  assignedReviewerName: string | null
  escalatedByAdminId  : string | null
  escalatedByAdminName: string | null
  escalatedAt         : string | null
  escalationReason    : string | null
  country           : { id: string; name: string; code: string } | null
  vendorType        : { id: string; name: string } | null
  documents         : Doc[]
}

export interface EligibleReviewer {
  id       : string
  firstName: string
  lastName : string
  email    : string
}

export interface ApplicationListResult {
  applications : VendorApplicationListItem[]
  total        : number
  page         : number
  pageSize     : number
  totalPages   : number
}

export interface VendorAccountListItem {
  id                : string
  legalBusinessName : string
  businessEmail     : string
  status            : string
  countryId         : string
  country?          : { id: string; name: string; code: string }
  vendorType?       : { id: string; name: string }
  user?             : { isBanned: boolean } | null
  createdAt         : string
  suspendedAt?      : string | null
  _count?           : { outlets: number }
}

export interface VendorListResult {
  accounts   : VendorAccountListItem[]
  total      : number
  page       : number
  pageSize   : number
  totalPages : number
}


export interface VendorMetrics {
  totalVendors: number
  activeVendors: number
  suspendedVendors: number
  bannedVendors: number

  draftApplications: number
  submittedApplications: number
  underReviewApplications: number
  approvedApplications: number
  rejectedApplications: number

  vendorsByType: {
    type: string
    count: number
  }[]
}

export interface LatestVendorApplication {
  id: string
  legalBusinessName: string
  vendorType: { id: string; name: string }
  // Plain literal union, not the VendorApplicationStatus enum — this feeds
  // components/countries/detail/vendor/StatusBadge, which also renders
  // vendor-account statuses (ACTIVE/SUSPENDED/BANNED) that aren't part of
  // the application status enum at all.
  status:
    | "DRAFT"
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "NEEDS_REVISION"
    | "APPROVED"
    | "REJECTED"
  submittedAt: string | null
}