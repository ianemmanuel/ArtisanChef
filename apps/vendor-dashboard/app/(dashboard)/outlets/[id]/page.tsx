import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Crown } from "lucide-react"
import { Button } from "@repo/ui/components/button"
import { PageHeader } from "@/components/dashboard/layout/PageHeader"
import { PageGrid } from "@/components/dashboard/layout/DashboardShell"
import { OutletStatusBadges } from "@/components/outlets/OutletStatusBadges"
import { OutletGoLivePanel } from "@/components/outlets/OutletGoLivePanel"
import { OutletInspectionCard } from "@/components/outlets/OutletInspectionCard"
import { OutletDetailHero } from "@/components/outlets/OutletDetailHero"
import { OutletEditSections } from "@/components/outlets/OutletEditSections"
import { OutletFlagNotice } from "@/components/outlets/OutletFlagNotice"
import { getOutlet } from "@/lib/vendor/outlets"
import { requireSetupAccess } from "@/lib/vendor/guards"

export default async function OutletDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireSetupAccess()

  const { id } = await params
  const outlet = await getOutlet(id)
  if (!outlet) notFound()

  return (
    <PageGrid>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl" asChild>
          <Link href="/outlets"><ChevronLeft className="size-4" /></Link>
        </Button>
        <PageHeader
          title={outlet.name}
          description={outlet.city?.name ?? ""}
          actions={
            <div className="flex items-center gap-2">
              {outlet.isMainOutlet && (
                <span className="flex items-center gap-1.5 badge-primary">
                  <Crown className="size-3" />Primary
                </span>
              )}
              <OutletStatusBadges outlet={outlet} />
            </div>
          }
        />
      </div>

      {outlet.goLiveStatus && <OutletGoLivePanel status={outlet.goLiveStatus} />}
      <OutletInspectionCard outletId={outlet.id} readiness={outlet.mealPlanReadiness} />

      <OutletDetailHero outlet={outlet} />
      <OutletEditSections outlet={outlet} />

      {outlet.reviewStatus === "FLAGGED" && <OutletFlagNotice reasons={outlet.flagReasons} />}
    </PageGrid>
  )
}
