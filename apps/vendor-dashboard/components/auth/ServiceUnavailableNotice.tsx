"use client"

import { useRouter } from "next/navigation"
import { ServerCrash } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/*
 * Shown when the backend itself is reachable but degraded (database
 * unavailable, etc. — see SERVICE_UNAVAILABLE in PrismaError.ts). The
 * vendor is still signed in with Clerk; this is deliberately not a
 * sign-out or an error crash, just "try again in a moment."
 */
export function ServiceUnavailableNotice() {
  const router = useRouter()

  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive-bg">
          <ServerCrash className="size-6 text-destructive" />
        </div>
        <h1 className="font-display text-xl font-semibold text-foreground">We're having trouble connecting</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          You're still signed in — this is a temporary issue on our end. Please try again in a moment.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.refresh()}>
          Try again
        </Button>
      </CardContent>
    </Card>
  )
}
