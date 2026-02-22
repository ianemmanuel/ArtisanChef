import { ReactNode } from "react"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { OnboardingStepIndicator } from "@/components/onboarding"

interface Props {
  children: ReactNode
}

export const dynamic = "force-dynamic"

export default async function OnboardingLayout({ children }: Props) {
  const { getToken, userId } = await auth()

  if (!userId) redirect("/sign-in")

  const token = await getToken()
  if (!token) redirect("/sign-in")

  const res = await fetch(`${process.env.BACKEND_API_URL}/vendor/v1/application`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (res.status === 401) {
    redirect("/sign-in")
  }

  // 🟢 No application yet → valid state
  let application = null

  if (res.status === 404) {
    application = null
  } else if (res.ok) {
    application = await res.json()
  } else {
    // 🔥 Real system failure
    throw new Error("APPLICATION_FETCH_FAILED")
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-orange-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <span className="text-sm font-semibold text-stone-800 tracking-tight">
              Vendor Onboarding
            </span>
          </div>
          <span className="text-xs text-stone-400 font-medium tracking-wide uppercase">
            Application Portal
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <OnboardingStepIndicator application={application} />
        <div className="mt-8">{children}</div>
      </div>
    </div>
  )
}