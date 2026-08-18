import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { VendorApplicationDetail, ChangeVendorApplicationScopeRequest } from "@repo/types/vendor-app"

//* Destructive — DRAFT-only, clears uploaded documents if country/vendor
//* type actually changes. See vendor.application.service.ts's changeApplicationScope.
export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as ChangeVendorApplicationScopeRequest

  return proxyBackendCall(() =>
    backendFetch<{ application: VendorApplicationDetail; documentsCleared: boolean }>(
      "/vendor/v1/application/change-scope",
      { method: "PATCH", body: JSON.stringify(body) },
    ),
  )
}
