import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { VendorType } from "@repo/types/vendor-app"

// Admin-curated reference data — active vendor types change rarely, so
// a short revalidation window is safe and skips the backend round trip.
export async function GET(req: NextRequest) {
  const countryId = req.nextUrl.searchParams.get("countryId")

  return proxyBackendCall(() =>
    backendFetch<{ vendorTypes: VendorType[] }>(
      `/meta/v1/vendor-types${countryId ? `?countryId=${encodeURIComponent(countryId)}` : ""}`,
      { revalidate: 300 },
    ),
  )
}
