import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { DocumentRequirementsResponse } from "@repo/types/vendor-app"

// Which document types are required is driven by country/vendor-type
// config an admin sets up front, not something that changes mid-session
// — safe to reuse a response for a short window.
export async function GET() {
  return proxyBackendCall(() =>
    backendFetch<DocumentRequirementsResponse>("/vendor/v1/documents/requirements", { revalidate: 120 }),
  )
}
