import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { VendorGoLiveStatus } from "@repo/types/vendor-app"

export async function GET() {
  return proxyBackendCall(() =>
    backendFetch<VendorGoLiveStatus>("/vendor/v1/profile/go-live-status"),
  )
}
