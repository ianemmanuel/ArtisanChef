import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { AddPayoutAccountRequest, VendorPayoutAccount } from "@repo/types/vendor-app"

export async function GET() {
  return proxyBackendCall(() =>
    backendFetch<VendorPayoutAccount[]>("/vendor/v1/payouts/accounts"),
  )
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as AddPayoutAccountRequest

  return proxyBackendCall(() =>
    backendFetch<VendorPayoutAccount>("/vendor/v1/payouts/accounts", {
      method: "POST",
      body  : JSON.stringify(body),
    }),
  )
}
