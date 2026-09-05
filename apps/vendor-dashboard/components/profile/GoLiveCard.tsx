"use client"

import Link from "next/link"
import { CheckCircle2, Circle, Radio } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useGoLiveStatus, useVendorProfile } from "@/lib/queries/profile"
import { readinessRequirements } from "@/lib/readiness"
import { GoLiveButton } from "@/components/readiness/GoLiveButton"

/*
 * The go-live widget on the Public profile page. The profile form is right
 * below on the same page, so the "profile" requirement here is plain text
 * rather than a link. The fuller setup overview lives at /setup
 * (SetupOverview) — both consume the same readinessRequirements() mapper
 * and the same GoLiveButton.
 */
export function GoLiveCard() {
  const { data: status, isLoading: statusLoading } = useGoLiveStatus()
  const { data: profile, isLoading: profileLoading } = useVendorProfile()

  if (statusLoading || profileLoading) return <Skeleton className="h-48 w-full rounded-xl" />
  if (!status) return null

  return (
    <Card className={cn(status.isPublished ? "border-success/40" : undefined)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className={cn("size-4", status.isPublished ? "text-success" : "text-muted-foreground")} />
              {status.isPublished ? "You're live" : "Go live"}
            </CardTitle>
            <CardDescription>
              {status.isPublished
                ? "Your storefront is published and visible to customers."
                : "Complete these to publish your storefront. They can be done in any order."}
            </CardDescription>
          </div>
          {profile?.reviewStatus === "MANUALLY_REJECTED" && <Badge className="bg-destructive-bg text-destructive">Rejected</Badge>}
          {profile?.reviewStatus === "FLAGGED" && <Badge className="bg-warning-bg text-warning">Under review</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {readinessRequirements(status).map((req) => (
            <div key={req.key} className="flex items-center gap-2 text-sm">
              {req.met
                ? <CheckCircle2 className="size-4 shrink-0 text-success" />
                : <Circle className="size-3.5 shrink-0 text-muted-foreground" />}
              {req.met ? (
                <span className="text-foreground">{req.doneLabel}</span>
              ) : req.key === "profile" ? (
                <span className="text-muted-foreground">{req.todoLabel}</span>
              ) : (
                <Link href={req.href} className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
                  {req.todoLabel}
                </Link>
              )}
            </div>
          ))}
        </div>

        <GoLiveButton />
      </CardContent>
    </Card>
  )
}
