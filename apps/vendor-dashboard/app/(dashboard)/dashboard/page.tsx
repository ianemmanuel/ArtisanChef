import Link from "next/link"
import { UtensilsCrossed, Radio } from "lucide-react"
import { PageHeader } from '@/components/dashboard/layout/PageHeader'
import { PageGrid } from '@/components/dashboard/layout/DashboardShell'
import { Card, CardContent } from "@/components/ui/card"
import { requireOperationalAccess } from "@/lib/vendor/guards"

/*
 * The operational dashboard for a selling-ready vendor. Reserved for future
 * business/operational functionality (orders, meals, meal plans, performance)
 * — deliberately still a placeholder, with no manufactured metrics. Setup /
 * readiness lives at /setup now, not here. Access is guarded by the
 * (operational) layout; the direct call here keeps this page honest if it's
 * ever moved out of that group.
 */
export default async function DashboardPage() {
  const session = await requireOperationalAccess()
  const businessName = session.vendorAccount?.legalBusinessName ?? "your business"
  const published = session.goLiveStatus?.isPublished ?? false

  return (
    <PageGrid>
      <PageHeader
        title={`Welcome back, ${businessName}`}
        description="Your dashboard is being built out — meal management, orders, and analytics are coming soon."
      />

      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
        <Radio className={published ? "size-4 text-success" : "size-4 text-muted-foreground"} />
        {published ? (
          <span className="text-foreground">Your storefront is published and visible to customers.</span>
        ) : (
          <span className="text-muted-foreground">
            You're selling-ready but not published yet.{" "}
            <Link href="/setup" className="font-medium text-primary hover:underline">Go live from Setup</Link>.
          </span>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary-subtle">
            <UtensilsCrossed className="size-7 text-primary-subtle-fg" />
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground">More is on the way</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Meal management, orders, and performance tools will appear here as they roll out.
          </p>
        </CardContent>
      </Card>
    </PageGrid>
  )
}
