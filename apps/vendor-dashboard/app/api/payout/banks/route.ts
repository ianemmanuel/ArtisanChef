import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { VendorSupportedBanks } from "@repo/types/vendor-app"

export async function GET() {
  return proxyBackendCall(() =>
    backendFetch<VendorSupportedBanks>("/vendor/v1/payouts/banks"),
  )
}
