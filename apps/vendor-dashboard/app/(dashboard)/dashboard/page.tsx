import { backendFetch } from "@/lib/api/server"
import { PageHeader } from '@/components/dashboard/layout/PageHeader'
import { PageGrid } from '@/components/dashboard/layout/DashboardShell'
import { Card, CardContent } from "@/components/ui/card"
import { UtensilsCrossed } from "lucide-react"
import type { VendorSessionData } from "@repo/types/vendor-app"

/*
 * Placeholder home for an ACTIVE vendor account. Deliberately just the
 * application shell (sidebar, header, welcome area) — meal management,
 * orders, and analytics are separate, not-yet-built features. Don't add
 * business widgets here without real data behind them.
 */
export default async function DashboardPage() {
  const session = await backendFetch<VendorSessionData>("/vendor/v1/auth/session")
  const businessName = session.vendorAccount?.legalBusinessName ?? "your business"

  return (
    <PageGrid>
      <PageHeader
        title={`Welcome back, ${businessName}`}
        description="Your dashboard is being built out — meal management, orders, and analytics are coming soon."
      />

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary-subtle">
            <UtensilsCrossed className="size-7 text-primary-subtle-fg" />
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground">More is on the way</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your vendor account is active. Meal management, orders, and performance tools will appear here as
            they roll out.
          </p>
        </CardContent>
      </Card>
    </PageGrid>
  )
}
