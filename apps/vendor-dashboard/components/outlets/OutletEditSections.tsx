import { Clock, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card"
import { SectionGrid } from "@/components/dashboard/layout/DashboardShell"
import { UpdateOutletForm } from "@/components/outlets/UpdateOutletForm"
import { OperatingHoursForm } from "@/components/outlets/OperatingHoursForm"
import { OutletDocumentsSection } from "@/components/outlets/OutletDocumentsSection"
import type { Outlet } from "@/types/outlet"

/*
 * The three editable panels of an outlet — details, hours, documents.
 * Grouped because they're always shown together and share one card shell;
 * the page just places this block.
 */
export function OutletEditSections({ outlet }: { outlet: Outlet }) {
  return (
    <>
      <SectionGrid cols={3}>
        <div className="lg:col-span-2">
          <Card className="dash-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Edit Details</CardTitle>
            </CardHeader>
            <CardContent><UpdateOutletForm outlet={outlet} /></CardContent>
          </Card>
        </div>

        <Card className="dash-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Clock className="size-4 text-[var(--primary)]" />Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OperatingHoursForm outletId={outlet.id} existing={outlet.operatingHours} />
          </CardContent>
        </Card>
      </SectionGrid>

      <Card className="dash-card border-0">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <FileText className="size-4 text-[var(--primary)]" />Documents
          </CardTitle>
        </CardHeader>
        <CardContent><OutletDocumentsSection outletId={outlet.id} /></CardContent>
      </Card>
    </>
  )
}
