import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { VendorProfile } from "@repo/types/vendor-app"

export async function POST() {
  return proxyBackendCall(() =>
    backendFetch<VendorProfile>("/vendor/v1/profile/publish", { method: "POST" }),
  )
}
