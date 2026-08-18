import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { VendorSessionData } from "@repo/types/vendor-app"

export async function GET() {
  return proxyBackendCall(() => backendFetch<VendorSessionData>("/vendor/v1/auth/session"))
}
