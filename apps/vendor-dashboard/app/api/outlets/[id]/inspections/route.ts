import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { OutletInspectionRow } from "@repo/types/vendor-app"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyBackendCall(() =>
    backendFetch<OutletInspectionRow[]>(`/vendor/v1/outlets/${id}/inspections`),
  )
}
