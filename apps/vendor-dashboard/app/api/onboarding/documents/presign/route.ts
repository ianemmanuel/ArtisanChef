import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/api/server"
import { proxyBackendCall } from "@/lib/api/route-handler"
import type { PresignUploadRequest, PresignUploadResponse } from "@repo/types/vendor-app"

export async function POST(req: NextRequest) {
  const body = (await req.json()) as PresignUploadRequest

  return proxyBackendCall(() =>
    backendFetch<PresignUploadResponse>("/vendor/v1/documents/presign", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  )
}
