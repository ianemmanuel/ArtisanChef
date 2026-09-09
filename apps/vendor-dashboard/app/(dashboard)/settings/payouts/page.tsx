import { PageHeader } from "@/components/dashboard/layout/PageHeader"
import { PageGrid } from "@/components/dashboard/layout/DashboardShell"
import { PayoutPanel } from "@/components/payout/PayoutPanel"
import { requireSetupAccess } from "@/lib/vendor/guards"

/*
 * /settings/payouts — server component. The vendor manages the bank / mobile
 * money / wallet accounts we pay them out to. requireSetupAccess() gates
 * on an authenticated ACTIVE vendor; every payout mutation additionally
 * re-checks ownership + account status on the backend. A verified payout
 * account is one of the three selling-readiness requirements.
 */
export default async function PayoutPage() {
  await requireSetupAccess()

  return (
    <PageGrid>
      <PageHeader
        title="Payout accounts"
        description="Where we send your earnings. Add an account and verify it to become selling-ready — you can hold more than one and choose which is the default."
      />
      <PayoutPanel />
    </PageGrid>
  )
}
