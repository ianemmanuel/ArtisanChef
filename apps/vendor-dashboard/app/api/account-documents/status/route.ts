import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { VendorAccountDocumentStatusRow } from "@repo/types/vendor-app"

export async function GET() {
  return proxyBackendCall(() =>
    backendFetch<VendorAccountDocumentStatusRow[]>("/vendor/v1/account-documents/status"),
  )
}
