import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type {
  VendorApplicationDetail,
  CreateVendorApplicationRequest,
  UpdateVendorApplicationRequest,
} from "@repo/types/vendor-app"

export async function GET() {
  return proxyBackendCall(() =>
    backendFetch<VendorApplicationDetail>("/vendor/v1/application/get"),
  )
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateVendorApplicationRequest

  return proxyBackendCall(() =>
    backendFetch<VendorApplicationDetail>("/vendor/v1/application/create", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  )
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as UpdateVendorApplicationRequest

  return proxyBackendCall(() =>
    backendFetch<VendorApplicationDetail>("/vendor/v1/application/update", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  )
}
