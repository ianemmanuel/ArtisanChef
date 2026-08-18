import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { DocumentRequirementsResponse } from "@repo/types/vendor-app"

export async function GET() {
  return proxyBackendCall(() =>
    backendFetch<DocumentRequirementsResponse>("/vendor/v1/documents/requirements"),
  )
}
