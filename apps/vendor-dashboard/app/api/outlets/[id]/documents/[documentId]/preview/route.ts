import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const { id, documentId } = await params
  return proxyBackendCall(() =>
    backendFetch<{ url: string }>(`/vendor/v1/outlets/${id}/documents/${documentId}/preview`),
  )
}
