import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { VendorProfile, UpsertVendorProfileRequest } from "@repo/types/vendor-app"

export async function GET() {
  return proxyBackendCall(() =>
    backendFetch<VendorProfile | null>("/vendor/v1/profile"),
  )
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as UpsertVendorProfileRequest

  return proxyBackendCall(() =>
    backendFetch<VendorProfile>("/vendor/v1/profile", {
      method: "PUT",
      body  : JSON.stringify(body),
    }),
  )
}
