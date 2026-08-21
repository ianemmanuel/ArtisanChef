import { auth }          from "@clerk/nextjs/server"
import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_API_URL

/**
 * PATCH /api/document-types/[id]/[action]
 * Actions: activate | deactivate (toggles ACTIVE <-> INACTIVE only —
 * DEPRECATED/ARCHIVED aren't reachable through this endpoint).
 */
export async function PATCH(
  req    : NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  try {
    const { id, action } = await params
    const { getToken }   = await auth()
    const token           = await getToken()
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    if (!["activate", "deactivate"].includes(action)) {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 })
    }

    const res = await fetch(`${BACKEND}/admin/v1/document-types/${id}/${action}`, {
      method : "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await res.json()
    if (res.ok) revalidateTag(`document-type-${id}`, {})

    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error("[document-types-status]", err)
    return NextResponse.json({ message: "Internal error" }, { status: 500 })
  }
}
