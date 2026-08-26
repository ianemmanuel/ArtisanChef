import { Router } from "express"
import {
  handleListAdminNotifications,
  handleGetUnreadNotificationCount,
  handleMarkNotificationRead,
  handleMarkAllNotificationsRead,
} from "../../controllers/admin.notification.controller"

/**
 * Admin-facing in-app notification center. Mounted at: /admin/v1/notifications
 *
 * No requirePermission gate — every authenticated admin reads/manages only
 * their own notifications (scoped by adminUserId in the service layer),
 * same as how a vendor reads their own VendorNotification rows.
 */
const router: Router = Router()

router.get("/",             handleListAdminNotifications)
router.get("/unread-count", handleGetUnreadNotificationCount)
router.patch("/read-all",   handleMarkAllNotificationsRead)
router.patch("/:id/read",   handleMarkNotificationRead)

export default router
