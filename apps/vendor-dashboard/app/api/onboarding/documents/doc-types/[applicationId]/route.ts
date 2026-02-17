import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { userId, getToken } = await auth()
    const token = await getToken()

    if (!userId || !token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { applicationId } = await params
    const backendUrl = process.env.BACKEND_API_URL!

    const response = await fetch(
      `${backendUrl}/vendor/v1/documents/requirements/${applicationId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to fetch document types" },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching document types:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
