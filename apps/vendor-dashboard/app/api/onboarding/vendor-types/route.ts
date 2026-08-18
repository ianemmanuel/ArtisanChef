import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { VendorType } from "@repo/types/vendor-app"

export async function GET(req: NextRequest) {
  const countryId = req.nextUrl.searchParams.get("countryId")

  return proxyBackendCall(() =>
    backendFetch<{ vendorTypes: VendorType[] }>(
      `/meta/v1/onboarding/vendor-types${countryId ? `?countryId=${encodeURIComponent(countryId)}` : ""}`,
    ),
  )
}
