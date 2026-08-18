import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { DocumentProgress } from "@repo/types/vendor-app"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return proxyBackendCall(() =>
    backendFetch<{ progress: DocumentProgress }>(`/vendor/v1/documents/delete/${id}`, {
      method: "DELETE",
    }),
  )
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return proxyBackendCall(() =>
    backendFetch<{ url: string }>(`/vendor/v1/documents/${id}/preview`),
  )
}
