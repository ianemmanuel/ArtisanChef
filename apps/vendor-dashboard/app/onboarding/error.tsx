"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Replace with Sentry or your logging service later
    console.error("Onboarding error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white border border-stone-200 rounded-xl p-8 shadow-sm text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <span className="text-red-600 text-xl font-bold">!</span>
        </div>

        <h2 className="text-lg font-semibold text-stone-800 mb-2">
          We couldn't load your application
        </h2>

        <p className="text-sm text-stone-500 mb-6">
          Something went wrong while fetching your onboarding data.
          This could be a temporary issue. Please try again.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2.5 rounded-md transition"
          >
            Try again
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full text-sm text-stone-500 hover:text-stone-700 transition"
          >
            Return to dashboard
          </button>
        </div>

        {/* Optional debug info for development only */}
        {process.env.NODE_ENV === "development" && (
          <pre className="mt-6 text-left text-xs text-red-500 bg-red-50 p-3 rounded-md overflow-auto">
            {error.message}
          </pre>
        )}
      </div>
    </div>
  )
}