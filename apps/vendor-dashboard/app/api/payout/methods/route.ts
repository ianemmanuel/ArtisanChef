import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { AvailablePayoutMethod } from "@repo/types/vendor-app"

export async function GET() {
  return proxyBackendCall(() =>
    backendFetch<AvailablePayoutMethod[]>("/vendor/v1/payouts/methods"),
  )
}
