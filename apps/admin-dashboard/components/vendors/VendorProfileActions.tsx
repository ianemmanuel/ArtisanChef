"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@repo/ui/components/button"
import { Label } from "@repo/ui/components/label"
import { Textarea } from "@repo/ui/components/textarea"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@repo/ui/components/alert-dialog"
import type { VendorProfileAdmin } from "@/types"

interface Props {
  profile: VendorProfileAdmin
  /** VENDORS_PROFILES_MODERATE */
  canModerate: boolean
}

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json()
  return { ok: res.ok, data }
}

/**
 * Per-row profile moderation — deliberately simple, same "no claim/
 * escalate" reasoning as VendorAppealActions: approve clears the flag,
 * reject requires a reason and force-unpublishes if it was already live.
 */
export function VendorProfileActions({ profile, canModerate }: Props) {
  const router = useRouter()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [pending, setPending] = useState(false)

  if (!canModerate) return null
  if (profile.reviewStatus === "MANUALLY_APPROVED") {
    return <span className="text-xs text-muted-foreground">Approved</span>
  }

  async function doApprove() {
    setPending(true)
    const { ok, data } = await postJson(`/api/vendors/profiles/${profile.vendorAccountId}/approve`)
    if (ok) { toast.success("Profile approved"); router.refresh() }
    else toast.error("Failed to approve", { description: data.message })
    setPending(false)
  }

  async function doReject() {
    if (!reason.trim()) { toast.error("A reason is required"); return }
    setPending(true)
    const { ok, data } = await postJson(`/api/vendors/profiles/${profile.vendorAccountId}/reject`, { reason: reason.trim() })
    if (ok) { toast.success("Profile rejected"); setRejectOpen(false); router.refresh() }
    else toast.error("Failed to reject", { description: data.message })
    setPending(false)
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5" disabled={pending} onClick={doApprove}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
        Approve
      </Button>
      <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5 text-destructive hover:text-destructive" disabled={pending} onClick={() => { setReason(""); setRejectOpen(true) }}>
        <ThumbsDown className="h-3.5 w-3.5" />
        Reject
      </Button>

      <AlertDialog open={rejectOpen} onOpenChange={(o) => !pending && setRejectOpen(o)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="icon-badge icon-badge-danger h-11 w-11"><ThumbsDown className="h-5 w-5" /></div>
            <AlertDialogTitle>Reject profile</AlertDialogTitle>
            <AlertDialogDescription>
              {profile.displayName} — this blocks it from going live and notifies the vendor. If it's already published, it's taken offline immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What needs to change before this can be approved…" className="min-h-20 text-sm" />
          </div>
          <AlertDialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setRejectOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="button" variant="destructive" className="rounded-full gap-1.5" disabled={pending} onClick={doReject}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? "Saving…" : "Reject"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
