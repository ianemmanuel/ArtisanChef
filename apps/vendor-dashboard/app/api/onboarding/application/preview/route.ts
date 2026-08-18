import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { ApplicationPreview } from "@/lib/api/types"

export async function GET() {
  return proxyBackendCall(() =>
    backendFetch<ApplicationPreview>("/vendor/v1/application/preview"),
  )
}
