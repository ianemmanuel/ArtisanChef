import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { UpsertOutletDocumentRequest, UpsertOutletDocumentResponse } from "@repo/types/vendor-app"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = (await req.json()) as UpsertOutletDocumentRequest
  return proxyBackendCall(() =>
    backendFetch<UpsertOutletDocumentResponse>(`/vendor/v1/outlets/${id}/documents/upsert`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  )
}
