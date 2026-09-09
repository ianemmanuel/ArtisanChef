import { PageGrid } from "@/components/dashboard/layout/DashboardShell"
import { PageHeader } from "@/components/dashboard/layout/PageHeader"
import { ComingSoon } from "@/components/dashboard/layout/ComingSoon"
import { requireOperationalAccess } from "@/lib/vendor/guards"

export const metadata = { title: "Subscriptions" }

export default async function SubscriptionsPage() {
  await requireOperationalAccess()

  return (
    <PageGrid>
      <PageHeader title="Subscriptions" description="Recurring meal-plan subscribers." />
      <ComingSoon feature="Subscriptions" />
    </PageGrid>
  )
}
