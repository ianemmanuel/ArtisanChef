import { PageHeader } from "@/components/dashboard/layout/PageHeader"
import { PageGrid } from "@/components/dashboard/layout/DashboardShell"
import { CreateOutletForm } from "@/components/outlets/CreateOutletForm"
import { backendFetch } from "@/lib/api/server"
import { requireSetupAccess } from "@/lib/vendor/guards"
import type { City } from "@/types/outlet"

/*
 * Cities are vendor-specific (scoped to the vendor's registered country),
 * so this is a per-request read — not cached. The backend re-validates the
 * chosen city's country + active status on submit and stays authoritative.
 */
async function getCities(): Promise<City[]> {
  try {
    return await backendFetch<City[]>("/vendor/v1/cities")
  } catch {
    return []
  }
}

export default async function OutletCreatePage() {
  await requireSetupAccess()
  const cities = await getCities()

  return (
    <PageGrid>
      <PageHeader
        title="Add an outlet"
        description="A kitchen location where you'll prepare and serve orders. You can add more later."
      />
      <div className="mx-auto w-full max-w-2xl">
        <CreateOutletForm cities={cities} />
      </div>
    </PageGrid>
  )
}
