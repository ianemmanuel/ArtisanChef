import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function GET(req: NextRequest) {
  const { userId, getToken } = await auth()

  if (!userId) {
    return NextResponse.json(
      { status: "error", message: "Unauthorized" },
      { status: 401 }
    )
  }

  const token = await getToken()

  const { searchParams } = new URL(req.url)
  const countryId = searchParams.get("countryId")

  if (!countryId) {
    return NextResponse.json(
      { status: "error", message: "countryId is required" },
      { status: 400 }
    )
  }

  const backendRes = await fetch(
    `${process.env.BACKEND_API_URL}/meta/v1/vendor-types?countryId=${countryId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        //"x-app": "vendor",
      },
    }
  )

  const data = await backendRes.json()

  return NextResponse.json(data, {
    status: backendRes.status,
  })
}