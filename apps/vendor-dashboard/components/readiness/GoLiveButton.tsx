"use client"

import { toast } from "sonner"
import { Loader2, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGoLiveStatus, useVendorProfile, usePublishProfile, useUnpublishProfile } from "@/lib/queries/profile"
import { ClientApiError } from "@/lib/api/client"

/*
 * The publish / unpublish control. The ONLY "go live" affordance in the app —
 * shared by GoLiveCard (/settings/profile) and SetupOverview (/setup). It calls
 * the existing publish/unpublish endpoints; publishVendorProfile enforces
 * getVendorGoLiveStatus server-side, so the disabled state here is UX only.
 */
export function GoLiveButton() {
  const { data: status } = useGoLiveStatus()
  const { data: profile } = useVendorProfile()
  const publish = usePublishProfile()
  const unpublish = useUnpublishProfile()

  if (!status) return null

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

  return (
    <div className="space-y-3">
      {profile?.reviewStatus === "MANUALLY_REJECTED" && profile.rejectionReason && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive-bg p-3 text-sm text-destructive">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <span>{profile.rejectionReason} — edit your profile to resubmit it for review.</span>
        </div>
      )}

      {status.isPublished ? (
        <Button type="button" variant="outline" size="sm" onClick={handleUnpublish} disabled={unpublish.isPending}>
          {unpublish.isPending && <Loader2 className="size-3.5 animate-spin" />} Take offline
        </Button>
      ) : (
        <Button type="button" size="sm" onClick={handlePublish} disabled={!status.canGoLive || publish.isPending}>
          {publish.isPending && <Loader2 className="size-3.5 animate-spin" />} Go live
        </Button>
      )}
    </div>
  )
}
