// Frontend-local types for the identity module.
// Matches the updated AdminUser schema (firstName/lastName/employeeId).

export interface AdminRole {
  id         : string
  name       : string
  displayName: string
  description: string | null
}

export interface AdminPermission {
  id         : string
  key        : string
  module     : string
  description: string | null
  isActive   : boolean
}

export interface AdminUserScope {
  id         : string
  scopeType  : "GLOBAL" | "COUNTRY" | "CITY"
  countryId  : string | null
  cityId     : string | null
  country?   : { id: string; name: string; code: string } | null
  city?      : { id: string; name: string } | null
}

export interface AdminUserListItem {
  id                  : string
  firstName           : string
  middleName?          : string
  lastName            : string
  email               : string
  employeeId          : string | null
  status              : string
  isActive            : boolean
  lastSeenAt          : string | null
  createdAt           : string
  invitationSentCount : number
  invitationSentAt    : string | null
  role                : { name: string; displayName: string } | null
  scopes              : AdminUserScope[]
  reviewAvailability  : string
  unavailableFrom     : string | null
  unavailableUntil    : string | null
  unavailableReason   : string | null
}

export interface AdminUserDetail extends AdminUserListItem {
  roleId     : string | null
  invitedById: string | null
  invitedBy  : { id: string; firstName: string; lastName: string; email: string } | null
  permissions: Array<{ permission: AdminPermission }>
}

export interface ListAdminUsersResult {
  users      : AdminUserListItem[]
  total      : number
  page       : number
  pageSize   : number
  totalPages : number
}

export type { AdminSessionData } from "@repo/types/admin-app"

export interface ScopeEntry {
  scopeType : "GLOBAL" | "COUNTRY" | "CITY"
  countryId?: string
  cityId?   : string
}

export interface Country {
  id   : string
  name : string
  code : string
}

export interface City {
  id        : string
  name      : string
  countryId : string
}




export interface AuditLogActor {
  id       : string
  firstName: string
  lastName : string
  email    : string
}

export interface AuditLogEntry {
  id         : string
  adminUserId: string | null
  action     : string
  entityType : string
  entityId   : string | null
  changes    : { before?: Record<string, unknown>; after?: Record<string, unknown> } | null
  metadata   : Record<string, unknown> | null
  createdAt  : string
  adminUser  : AuditLogActor | null   // who performed the action
  target     : AuditLogActor | null   // the admin the action was performed on
}

export interface ListAuditLogsResult {
  logs      : AuditLogEntry[]
  total     : number
  page      : number
  pageSize  : number
  totalPages: number
}

export type CreateUserFormValues = {
  firstName      : string
  middleName?    : string   // ✅ undefined instead of null
  lastName       : string
  email          : string
  employeeId     : string
  roleId         : string
  permissionKeys : string[]
  scopes         : ScopeEntry[]
}