import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { UpsertDocumentRequest, UpsertDocumentResponse } from "@repo/types/vendor-app"

export async function POST(req: NextRequest) {
  const body = (await req.json()) as UpsertDocumentRequest

  return proxyBackendCall(() =>
    backendFetch<UpsertDocumentResponse>("/vendor/v1/documents/upsert", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  )
}
