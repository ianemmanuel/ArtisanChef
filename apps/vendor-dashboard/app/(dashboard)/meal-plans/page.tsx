import { PageGrid } from "@/components/dashboard/layout/DashboardShell"
import { PageHeader } from "@/components/dashboard/layout/PageHeader"
import { ComingSoon } from "@/components/dashboard/layout/ComingSoon"
import { requireSetupAccess } from "@/lib/vendor/guards"

export const metadata = { title: "Meal Plans" }

export default async function MealPlansPage() {
  await requireSetupAccess()

  return (
    <PageGrid>
      <PageHeader title="Meal Plans" description="Subscription meal plans you offer." />
      <ComingSoon feature="Meal Plans" />
    </PageGrid>
  )
}
