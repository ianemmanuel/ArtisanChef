import { PageHeader } from "@/components/dashboard/layout/PageHeader"
import { PageGrid } from "@/components/dashboard/layout/DashboardShell"
import { SetupOverview } from "@/components/setup/SetupOverview"
import { requireSetupAccess } from "@/lib/vendor/guards"

/*
 * The vendor setup overview — "get your business ready to sell". Accessible
 * to any ACTIVE vendor (a selling-ready vendor lands on /dashboard instead,
 * but can still come here). Server-rendered off the authoritative
 * getVendorGoLiveStatus carried on the session — it orchestrates the
 * payout / profile / outlet areas and links into them; it owns none of
 * their logic and never re-derives readiness.
 */
export default async function SetupPage() {
  const session = await requireSetupAccess()

  return (
    <PageGrid>
      <PageHeader
        title="Complete your setup"
        description="Finish setting up your business so you can start selling on DailyBread."
      />
      {session.goLiveStatus ? (
        <SetupOverview status={session.goLiveStatus} />
      ) : (
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t load your setup status just now. Refresh the page to try again.
        </p>
      )}
    </PageGrid>
  )
}
