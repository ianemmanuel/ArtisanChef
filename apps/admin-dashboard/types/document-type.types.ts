// Mirrors backend DocumentTypeConfig / DocumentTypeVendorType shapes
// (apps/backend/src/modules/admin/services/admin.documentType.service.ts).

export type DocumentScope       = "VENDOR" | "OUTLET" | "CITY"
export type DocumentTypeStatus  = "ACTIVE" | "INACTIVE" | "DEPRECATED" | "ARCHIVED"

export interface DocumentTypeVendorTypeLink {
  id            : string
  documentTypeId: string
  vendorTypeId  : string
  isRequired    : boolean
  vendorType    : { id: string; name: string }
}

export interface DocumentTypeConfig {
  id               : string
  name             : string
  code             : string
  description      : string | null
  scope            : DocumentScope
  countryId        : string
  cityId           : string | null
  city             : { id: string; name: string } | null
  isRequired       : boolean
  requiresExpiry   : boolean
  expiryWarningDays: number
  instructions     : string | null
  sampleUrl        : string | null
  status           : DocumentTypeStatus
  createdAt        : string
  updatedAt        : string
  vendorTypeConfigs: DocumentTypeVendorTypeLink[]
  deactivatedByAdminId: string | null
  deactivatedByName    : string | null
  deactivatedAt        : string | null
  deactivationReason   : string | null
}

export interface DocumentTypeListResult {
  documentTypes: DocumentTypeConfig[]
  total        : number
  page         : number
  pageSize     : number
  totalPages   : number
}
