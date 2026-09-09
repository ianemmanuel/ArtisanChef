import { PageGrid } from "@/components/dashboard/layout/DashboardShell"
import { PageHeader } from "@/components/dashboard/layout/PageHeader"
import { ComingSoon } from "@/components/dashboard/layout/ComingSoon"
import { requireOperationalAccess } from "@/lib/vendor/guards"

export const metadata = { title: "Orders" }

export default async function OrdersPage() {
  await requireOperationalAccess()

  return (
    <PageGrid>
      <PageHeader title="Orders" description="Incoming orders across your outlets." />
      <ComingSoon feature="Orders" />
    </PageGrid>
  )
}
