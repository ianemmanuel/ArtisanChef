import { auth }          from "@clerk/nextjs/server"
import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_API_URL

/**
 * POST /api/payment-methods/country-config
 * Body: { countryId, paymentMethodId, direction, ourAccountDetails?, verificationProvider?, verificationConfig?, displayOrder? }
 */
export async function POST(req: NextRequest) {
  try {
    const { getToken } = await auth()
    const token = await getToken()
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const res = await fetch(`${BACKEND}/admin/v1/payment-methods/country-config`, {
      method : "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body   : JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) {
      revalidateTag("payment-methods", {})
      if (typeof body?.countryId === "string") revalidateTag(`country-payment-methods-${body.countryId}`, {})
    }
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error("[country-payment-method-configure]", err)
    return NextResponse.json({ message: "Internal error" }, { status: 500 })
  }
}
