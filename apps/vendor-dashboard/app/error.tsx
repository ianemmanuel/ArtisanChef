"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

/*
 * App-wide safety net. Anything that reaches here is unexpected — known,
 * recoverable states (syncing account, degraded backend, banned/suspended)
 * are handled inline by the pages themselves and never throw. This is
 * deliberately not a sign-out: the vendor's Clerk session is untouched,
 * so "try again" just re-renders the segment that failed.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error("Unhandled error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-6">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive-bg">
            <AlertTriangle className="size-6 text-destructive" />
          </div>

          <h2 className="mb-2 text-lg font-semibold text-foreground">Something went wrong</h2>

          <p className="mb-6 text-sm text-muted-foreground">
            You&apos;re still signed in — this looks like a temporary issue. Please try again.
          </p>

          <div className="flex flex-col gap-2">
            <Button onClick={() => reset()}>Try again</Button>
            <Button variant="ghost" onClick={() => router.push("/")}>
              Return home
            </Button>
          </div>

          {process.env.NODE_ENV === "development" && (
            <pre className="mt-6 overflow-auto rounded-md bg-destructive-bg p-3 text-left text-xs text-destructive">
              {error.message}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
