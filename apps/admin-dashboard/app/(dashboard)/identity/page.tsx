import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { adminFetch } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { AdminPermissions } from "@repo/types/admin-app"
import { IdentityQuickLinks } from "@/components/identity/home/IdentityQuickLinks"
import type { ListAdminUsersResult } from "@/types"

export const metadata: Metadata = { title: "Identity & Access" }
export const revalidate = 120

export default async function IdentityHomePage() {
  const session = await getAdminSession()

  const canManage = session.permissions.includes(AdminPermissions.ADMIN_USERS_PROFILES_READ)
  const canCreate = session.permissions.includes(AdminPermissions.ADMIN_USERS_ACCOUNTS_CREATE)

  if (!canManage && !canCreate) redirect("/overview")

  // Just enough live data to make the entry card useful at a glance — the
  // full breakdown already lives on the Manage page.
  const [total, pending] = await Promise.all([
    canManage
      ? adminFetch<ListAdminUsersResult>(`/admin/v1/users?pageSize=1`, {
          next: { revalidate: 120, tags: ["admin-users"] },
        }).catch(() => ({ total: 0 }))
      : Promise.resolve({ total: 0 }),
    canManage
      ? adminFetch<ListAdminUsersResult>(`/admin/v1/users?status=pending&pageSize=1`, {
          next: { revalidate: 120, tags: ["admin-users"] },
        }).catch(() => ({ total: 0 }))
      : Promise.resolve({ total: 0 }),
  ])

  return (
    <div className="page-content animate-slide-up">
      <div className="admin-card flex items-center gap-4">
        <div className="icon-badge icon-badge-primary h-12 w-12">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Identity & Access</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Create and manage admin users, roles, permissions, and scope.
          </p>
        </div>
      </div>

      <IdentityQuickLinks
        canManage={canManage}
        canCreate={canCreate}
        totalCount={(total as { total: number }).total}
        pendingCount={(pending as { total: number }).total}
      />
    </div>
  )
}
