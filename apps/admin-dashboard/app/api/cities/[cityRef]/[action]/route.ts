import { auth } from "@clerk/nextjs/server"
import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_API_URL

/**
 * POST /api/cities/[cityRef]/[action]
 * Actions: activate | deactivate
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ cityRef: string; action: string }> },
) {
  try {
    const { cityRef, action } = await params
    const { getToken } = await auth()
    const token = await getToken()

    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const allowedActions = ["activate", "deactivate"]
    if (!allowedActions.includes(action)) {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 })
    }

    const res = await fetch(
      `${BACKEND}/admin/v1/cities/${cityRef}/${action}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    const data = await res.json()

    if (res.ok) {
      revalidateTag(`city-${cityRef}`, {})
      revalidateTag("cities", {})
    }

    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error("[city-action]", err)
    return NextResponse.json({ message: "Internal error" }, { status: 500 })
  }
}
