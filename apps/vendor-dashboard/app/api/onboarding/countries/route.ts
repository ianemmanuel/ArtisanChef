import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { Country } from "@repo/types/vendor-app"

// Admin-curated reference data — active countries change rarely, so a
// short revalidation window is safe and skips the backend round trip.
export async function GET() {
  return proxyBackendCall(() =>
    backendFetch<{ countries: Country[] }>("/meta/v1/countries", { revalidate: 300 }),
  )
}
