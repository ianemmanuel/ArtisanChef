import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Store } from "lucide-react"
import { adminFetch } from "@/lib/api"
import { getAdminSession } from "@/lib/auth/session"
import { AdminPermissions } from "@repo/types/admin-app"
import { VendorsQuickLinks }     from "@/components/vendors/home/VendorsQuickLinks"
import { VendorsWorkflowGuide }  from "@/components/vendors/home/VendorsWorkflowGuide"
import type { ApplicationListResult, VendorListResult } from "@/types"

export const metadata: Metadata = { title: "Vendors" }
export const revalidate = 120

export default async function VendorsPage() {
  const session = await getAdminSession()

  const canReadApps     = session.permissions.includes(AdminPermissions.VENDORS_APPLICATIONS_READ)
  const canReadAccounts = session.permissions.includes(AdminPermissions.VENDORS_ACCOUNTS_READ)

  if (!canReadApps && !canReadAccounts) redirect("/overview")

  // Just enough live data to make the two entry cards useful at a glance —
  // the full breakdowns already live on the Applications/Accounts pages.
  const [pending, accounts] = await Promise.all([
    canReadApps
      ? adminFetch<ApplicationListResult>(`/admin/v1/vendors/applications?status=SUBMITTED&pageSize=1`, {
          next: { revalidate: 120 },
        }).catch(() => ({ total: 0 }))
      : Promise.resolve({ total: 0 }),
    canReadAccounts
      ? adminFetch<VendorListResult>(`/admin/v1/vendors/accounts?status=ACTIVE&pageSize=1`, {
          next: { revalidate: 120 },
        }).catch(() => ({ total: 0 }))
      : Promise.resolve({ total: 0 }),
  ])

  return (
    <div className="page-content animate-slide-up">
      <div className="admin-card flex items-center gap-4">
        <div className="icon-badge icon-badge-primary h-12 w-12">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Vendors</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Onboard, review, and manage every vendor on the platform.
          </p>
        </div>
      </div>

      <VendorsQuickLinks
        canReadApps={canReadApps}
        canReadAccounts={canReadAccounts}
        pendingCount={(pending as { total: number }).total}
        accountsCount={(accounts as { total: number }).total}
      />

      {canReadApps && <VendorsWorkflowGuide />}
    </div>
  )
}
