import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"


export async function GET(request: NextRequest) {
  try {
    const { userId, getToken } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const token = await getToken()

    if(!token){
        return NextResponse.json(
            {error:"Unauthorized"},
            {status: 401}
        )
    }

    const backendUrl = process.env.BACKEND_API_URL!

    const response = await fetch(`${backendUrl}/vendor/v1/application`, 
    {       
      method:'GET',
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to fetch application" },
        { status: response.status }
      )
    }

    return NextResponse.json(data, { status:response.status })
  } catch (error) {
    console.error("Error fetching application:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, getToken } = await auth()

    const token = await getToken()

    if (!userId || !token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()

    const backendUrl = process.env.BACKEND_API_URL!

    const response = await fetch(`${backendUrl}/vendor/v1/application/upsert-application`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to save application" },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error saving application:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}