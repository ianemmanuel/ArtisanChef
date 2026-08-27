import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return proxyBackendCall(() =>
    backendFetch<{ success: boolean }>(`/vendor/v1/payouts/accounts/${id}`, {
      method: "DELETE",
    }),
  )
}
