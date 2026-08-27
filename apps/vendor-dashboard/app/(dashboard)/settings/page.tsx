import { PageHeader } from "@/components/dashboard/layout/PageHeader"
import { PageGrid } from "@/components/dashboard/layout/DashboardShell"
import { PayoutAccountsSection } from "@/components/payout/PayoutAccountsSection"

export default function SettingsPage() {
  return (
    <PageGrid>
      <PageHeader
        title="Payout accounts"
        description="Manage the bank, mobile money, or wallet accounts we pay you out to."
      />
      <PayoutAccountsSection />
    </PageGrid>
  )
}