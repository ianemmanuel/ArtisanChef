import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { UpsertAccountDocumentRequest, UpsertAccountDocumentResponse } from "@repo/types/vendor-app"

// No revalidateTag needed here — the status GET route below reads via
// backendFetch's default cache: "no-store", and the client refetches it
// through useUpsertAccountDocument's react-query invalidation, not a
// Next.js cache tag.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as UpsertAccountDocumentRequest

  return proxyBackendCall(() =>
    backendFetch<UpsertAccountDocumentResponse>("/vendor/v1/account-documents/upsert", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  )
}
