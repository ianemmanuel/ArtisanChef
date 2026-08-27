"use client"

import Link from "next/link"
import { toast } from "sonner"
import { CheckCircle2, Circle, Loader2, Radio, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useGoLiveStatus, useVendorProfile, usePublishProfile, useUnpublishProfile } from "@/lib/queries/profile"
import { ClientApiError } from "@/lib/api/client"

const BLOCKER_LABEL: Record<string, { label: string; href?: string }> = {
  VERIFIED_PAYOUT_ACCOUNT: { label: "Add and verify a payout account", href: "/settings" },
  PROFILE                : { label: "Fill out your public profile below" },
  PROFILE_UNDER_REVIEW   : { label: "Your profile is pending admin review" },
  OUTLET                 : { label: "Add at least one active outlet", href: "/outlets" },
}

export function GoLiveCard() {
  const { data: status, isLoading: statusLoading } = useGoLiveStatus()
  const { data: profile, isLoading: profileLoading } = useVendorProfile()
  const publish = usePublishProfile()
  const unpublish = useUnpublishProfile()

  const isLoading = statusLoading || profileLoading

  async function handlePublish() {
    try {
      await publish.mutateAsync()
      toast.success("You're live!")
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Failed to go live")
    }
  }

  async function handleUnpublish() {
    try {
      await unpublish.mutateAsync()
      toast.success("Profile unpublished")
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Failed to unpublish")
    }
  }

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />
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
                ? "Your profile is public and your outlets can accept orders."
                : "Complete these to make your profile public."}
            </CardDescription>
          </div>
          {profile?.reviewStatus === "MANUALLY_REJECTED" && <Badge className="bg-destructive-bg text-destructive">Rejected</Badge>}
          {profile?.reviewStatus === "FLAGGED" && <Badge className="bg-warning-bg text-warning">Under review</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile?.reviewStatus === "MANUALLY_REJECTED" && profile.rejectionReason && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive-bg p-3 text-sm text-destructive">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <span>{profile.rejectionReason} — edit your profile below to resubmit it for review.</span>
          </div>
        )}

        <div className="space-y-2">
          {status.blockers.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" /> Everything's ready</p>
          ) : (
            status.blockers.map((b) => {
              const meta = BLOCKER_LABEL[b] ?? { label: b }
              return (
                <div key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Circle className="size-3.5 shrink-0" />
                  {meta.href ? <Link href={meta.href} className="underline underline-offset-2 hover:text-foreground">{meta.label}</Link> : <span>{meta.label}</span>}
                </div>
              )
            })
          )}
        </div>

        {status.isPublished ? (
          <Button type="button" variant="outline" size="sm" onClick={handleUnpublish} disabled={unpublish.isPending}>
            {unpublish.isPending && <Loader2 className="size-3.5 animate-spin" />} Take offline
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={handlePublish} disabled={!status.canGoLive || publish.isPending}>
            {publish.isPending && <Loader2 className="size-3.5 animate-spin" />} Go live
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
