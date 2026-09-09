import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { VendorSupportedBanks } from "@repo/types/vendor-app"

export async function GET(req: NextRequest) {
  // The bank directory is routed through the payout method's provider, so
  // the method id is required routing context — forwarded verbatim.
  const methodId = req.nextUrl.searchParams.get("methodId") ?? ""

  return proxyBackendCall(() =>
    backendFetch<VendorSupportedBanks>(`/vendor/v1/payouts/banks?methodId=${encodeURIComponent(methodId)}`),
  )
}
