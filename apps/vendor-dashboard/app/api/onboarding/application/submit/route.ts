import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"

export async function POST() {
  return proxyBackendCall(() =>
    backendFetch<{ id: string; status: string }>("/vendor/v1/application/submit", { method: "POST" }),
  )
}
