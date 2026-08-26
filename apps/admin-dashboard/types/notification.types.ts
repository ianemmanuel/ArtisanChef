// Admin-facing in-app notification center — the AdminUser counterpart to
// vendor-facing VendorNotification. Roadmap "compliance case workflow
// refinement" (CLAUDE.md). Starts with one type; more can be added to the
// backend's AdminNotificationType enum without a frontend type change,
// since `type` is only ever displayed via its title/message, never
// switched on here.

export type AdminNotificationType = "COMPLIANCE_CASE_STALE"

export interface AdminNotification {
  id         : string
  adminUserId: string
  type       : AdminNotificationType
  title      : string
  message    : string
  metadata   : Record<string, unknown> | null
  isRead     : boolean
  readAt     : string | null
  createdAt  : string
}

export interface AdminNotificationListResult {
  notifications: AdminNotification[]
  total        : number
  page         : number
  pageSize     : number
  totalPages   : number
  unreadCount  : number
}
