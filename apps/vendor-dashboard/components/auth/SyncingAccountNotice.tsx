"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/*
 * Shown when Clerk auth succeeded but the vendor signup webhook hasn't
 * created the VendorUser row yet (loadVendorContext's VENDOR_USER_NOT_FOUND).
 * This is a race, not a failure — it resolves itself within a couple of
 * seconds once the webhook lands, so we poll instead of asking the vendor
 * to figure out what to do.
 */
export function SyncingAccountNotice() {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 3000)
    return () => clearInterval(interval)
  }, [router])

  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <h1 className="font-display text-xl font-semibold text-foreground">Setting up your account</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This usually takes just a few seconds. This page will continue automatically once it&apos;s ready.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.refresh()}>
          Check again
        </Button>
      </CardContent>
    </Card>
  )
}
