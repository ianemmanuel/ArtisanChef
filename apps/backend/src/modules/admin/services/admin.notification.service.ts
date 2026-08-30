import { prisma, Prisma, type AdminNotificationType } from "@repo/db"
import { ApiError } from "@/errors/ApiError"

/*
 * Admin-facing in-app notification center — the AdminUser counterpart to
 * VendorNotification. Every admin only ever sees their own rows (scoped
 * by adminUserId = the caller, not by country/permission — a notification
 * that was already created for someone is theirs to read regardless of
 * their current scope/permissions, same as how VendorNotification works
 * for vendors).
 */

export interface CreateAdminNotificationInput {
  adminUserId: string
  type       : AdminNotificationType
  title      : string
  message    : string
  metadata?  : Record<string, unknown>
}

export async function createAdminNotification(input: CreateAdminNotificationInput) {
  return prisma.adminNotification.create({
    data: {
      adminUserId: input.adminUserId,
      type       : input.type,
      title      : input.title,
      message    : input.message,
      // Same "round-trip through JSON to satisfy Prisma's InputJsonValue"
      // convention as audit.logger.ts's changes/metadata.
      metadata: input.metadata ? (JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue) : undefined,
    },
  })
}

export async function listAdminNotifications(
  adminUserId: string,
  params: { unreadOnly?: boolean; types?: AdminNotificationType[]; page?: number; pageSize?: number } = {},
) {
  const { unreadOnly, types, page = 1, pageSize = 20 } = params
  const skip = (page - 1) * pageSize
  const where = {
    adminUserId,
    ...(unreadOnly ? { isRead: false } : {}),
    ...(types && types.length > 0 ? { type: { in: types } } : {}),
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.adminNotification.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
    prisma.adminNotification.count({ where }),
    prisma.adminNotification.count({ where: { adminUserId, isRead: false } }),
  ])

  return { notifications, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)), unreadCount }
}

export async function getUnreadAdminNotificationCount(adminUserId: string): Promise<number> {
  return prisma.adminNotification.count({ where: { adminUserId, isRead: false } })
}

export async function markAdminNotificationRead(id: string, adminUserId: string) {
  const notification = await prisma.adminNotification.findUnique({ where: { id } })
  if (!notification || notification.adminUserId !== adminUserId) {
    throw new ApiError(404, "Notification not found", "NOT_FOUND")
  }
  if (notification.isRead) return notification

  return prisma.adminNotification.update({
    where: { id },
    data : { isRead: true, readAt: new Date() },
  })
}

export async function markAllAdminNotificationsRead(adminUserId: string): Promise<{ count: number }> {
  const result = await prisma.adminNotification.updateMany({
    where: { adminUserId, isRead: false },
    data : { isRead: true, readAt: new Date() },
  })
  return { count: result.count }
}
