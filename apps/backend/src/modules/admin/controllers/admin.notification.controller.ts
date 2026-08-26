import { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import {
  listAdminNotifications,
  getUnreadAdminNotificationCount,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "../services/admin.notification.service"

export const handleListAdminNotifications: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser } = req as unknown as AdminRequest
    const { unreadOnly, page, pageSize } = req.query as { unreadOnly?: string; page?: string; pageSize?: string }

    const result = await listAdminNotifications(adminUser.id, {
      unreadOnly: unreadOnly === "true",
      page      : page     ? parseInt(page)     : undefined,
      pageSize  : pageSize ? parseInt(pageSize) : undefined,
    })
    return sendSuccess(res, result, "Notifications fetched")
  } catch (err) { next(err) }
}

export const handleGetUnreadNotificationCount: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser } = req as unknown as AdminRequest
    const count = await getUnreadAdminNotificationCount(adminUser.id)
    return sendSuccess(res, { count })
  } catch (err) { next(err) }
}

export const handleMarkNotificationRead: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }
    const notification = await markAdminNotificationRead(id, adminUser.id)
    return sendSuccess(res, notification, "Notification marked read")
  } catch (err) { next(err) }
}

export const handleMarkAllNotificationsRead: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser } = req as unknown as AdminRequest
    const result = await markAllAdminNotificationsRead(adminUser.id)
    return sendSuccess(res, result, "Notifications marked read")
  } catch (err) { next(err) }
}
