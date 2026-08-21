import { auth } from "@clerk/nextjs/server"
import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_API_URL

/** GET /api/countries/[countryRef]/cities — used client-side by ScopeSelector */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ countryRef: string }> },
) {
  try {
    const { countryRef } = await params
    const { getToken } = await auth()
    const token = await getToken()

    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const res = await fetch(`${BACKEND}/admin/v1/countries/${countryRef}/cities`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 },
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error("[country-cities-list]", err)
    return NextResponse.json({ message: "Internal error" }, { status: 500 })
  }
}

/** POST /api/countries/[countryRef]/cities — create a city in this country */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ countryRef: string }> },
) {
  try {
    const { countryRef } = await params
    const { getToken } = await auth()
    const token = await getToken()

    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const body = await req.text()

    const res = await fetch(`${BACKEND}/admin/v1/countries/${countryRef}/cities`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
    })

    const data = await res.json()

    if (res.ok) {
      revalidateTag(`cities-${countryRef}`, {})
      revalidateTag(`country-${countryRef}`, {})
    }

    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error("[country-cities-create]", err)
    return NextResponse.json({ message: "Internal error" }, { status: 500 })
  }
}
