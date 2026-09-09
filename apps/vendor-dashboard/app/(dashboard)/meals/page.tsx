import { PageGrid } from "@/components/dashboard/layout/DashboardShell"
import { PageHeader } from "@/components/dashboard/layout/PageHeader"
import { ComingSoon } from "@/components/dashboard/layout/ComingSoon"
import { requireSetupAccess } from "@/lib/vendor/guards"

export const metadata = { title: "Meals" }

export default async function MealsPage() {
  await requireSetupAccess()

  return (
    <PageGrid>
      <PageHeader title="Meals" description="Build your menu — available before you go live." />
      <ComingSoon feature="Meals" />
    </PageGrid>
  )
}
