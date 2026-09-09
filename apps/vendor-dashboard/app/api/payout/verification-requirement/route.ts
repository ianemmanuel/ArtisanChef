import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { PayoutVerificationRequirement } from "@repo/types/vendor-app"

export async function GET() {
  return proxyBackendCall(() =>
    backendFetch<PayoutVerificationRequirement>("/vendor/v1/payouts/verification-requirement"),
  )
}
