import type { Metadata } from "next"
import { Bell } from "lucide-react"
import { adminFetch } from "@/lib/api"
import { NotificationsList } from "@/components/notifications/NotificationsList"
import type { AdminNotificationListResult } from "@/types"

export const metadata: Metadata = { title: "Notifications" }

export default async function NotificationsPage() {
  const result = await adminFetch<AdminNotificationListResult>(
    "/admin/v1/notifications?pageSize=50",
    { cache: "no-store" },
  ).catch(() => null)

  return (
    <div className="page-content animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="icon-badge icon-badge-primary h-10 w-10">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">Things that need your attention across the ERP.</p>
        </div>
      </div>

      <NotificationsList notifications={result?.notifications ?? []} unreadCount={result?.unreadCount ?? 0} />
    </div>
  )
}
