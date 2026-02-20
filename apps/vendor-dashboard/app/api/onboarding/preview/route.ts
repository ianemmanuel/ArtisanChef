import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function GET(req: NextRequest) {
  try {
    const { userId, getToken } = await auth()
    const token = await getToken()

    if (!userId || !token) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const res = await fetch(
      `${process.env.BACKEND_API_URL}/vendor/v1/application/preview`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    )

    const data = await res.json()

    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch preview data" },
      { status: 500 }
    )
  }
}
