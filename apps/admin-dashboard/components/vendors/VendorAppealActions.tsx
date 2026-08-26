"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Loader2, UserCheck, UserMinus, Gavel, ArrowUpRight } from "lucide-react"
import { Button } from "@repo/ui/components/button"
import { Label } from "@repo/ui/components/label"
import { Textarea } from "@repo/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@repo/ui/components/alert-dialog"
import { useAdminSession } from "@/providers/admin-session-provider"
import type { VendorAppeal } from "@/types"

interface Props {
  appeal: VendorAppeal
  /** VENDORS_APPEALS_MANAGE */
  canManage: boolean
}

async function patchJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const data = await res.json()
  return { ok: res.ok, data }
}

/**
 * Per-row appeal actions — assign/unassign to self, and resolve (Upheld /
 * Overturned + optional note). Deliberately no claim-race lock or
 * escalation pool, unlike compliance/applications — see VendorAppeal's
 * model comment in schema.prisma for why.
 *
 * Resolving OVERTURNED never auto-reverses the underlying decision — this
 * only offers a shortcut link to where that's actually done (the vendor
 * detail page's existing reinstate/unban actions). A rejected application
 * has no reversal action at all yet (known, documented gap — see
 * CLAUDE.md's VM-P1-04 entry), so no shortcut is shown for that case.
 */
export function VendorAppealActions({ appeal, canManage }: Props) {
  const router = useRouter()
  const session = useAdminSession()
  const [resolveOpen, setResolveOpen] = useState(false)
  const [outcome, setOutcome] = useState<"UPHELD" | "OVERTURNED">("UPHELD")
  const [note, setNote] = useState("")
  const [pending, setPending] = useState(false)

  const isResolved = appeal.status === "UPHELD" || appeal.status === "OVERTURNED"
  const isMine = appeal.assignedReviewerId === session.id

  async function doAssign(reviewerId: string | null) {
    setPending(true)
    const { ok, data } = await patchJson(`/api/vendors/appeals/${appeal.id}/assign`, { reviewerId })
    if (ok) { toast.success(reviewerId ? "Assigned to you" : "Unassigned"); router.refresh() }
    else toast.error("Failed to update assignment", { description: data.message })
    setPending(false)
  }

  async function doResolve() {
    setPending(true)
    const { ok, data } = await patchJson(`/api/vendors/appeals/${appeal.id}/resolve`, { outcome, resolutionNote: note.trim() || undefined })
    if (ok) { toast.success("Appeal resolved"); setResolveOpen(false); router.refresh() }
    else toast.error("Failed to resolve", { description: data.message })
    setPending(false)
  }

  if (isResolved) {
    if (appeal.status !== "OVERTURNED") return null
    if (appeal.subjectType === "ACCOUNT_SUSPENSION") {
      return (
        <Link href={`/vendors/accounts/${appeal.vendorId}`} className="inline-flex items-center gap-1 rounded-full border border-success/40 px-2.5 py-1 text-xs font-medium text-success hover:bg-success-bg">
          Reinstate vendor <ArrowUpRight className="h-3 w-3" />
        </Link>
      )
    }
    if (appeal.subjectType === "ACCOUNT_BAN") {
      return (
        <Link href={`/vendors/accounts/${appeal.vendorId}`} className="inline-flex items-center gap-1 rounded-full border border-success/40 px-2.5 py-1 text-xs font-medium text-success hover:bg-success-bg">
          Unban vendor <ArrowUpRight className="h-3 w-3" />
        </Link>
      )
    }
    return <span className="text-xs text-muted-foreground">No reopen action exists yet</span>
  }

  if (!canManage) return null

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {isMine ? (
        <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5" disabled={pending} onClick={() => doAssign(null)}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
          Unassign
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5" disabled={pending} onClick={() => doAssign(session.id)}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
          Assign to me
        </Button>
      )}
      <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5" onClick={() => { setOutcome("UPHELD"); setNote(""); setResolveOpen(true) }}>
        <Gavel className="h-3.5 w-3.5" />
        Resolve
      </Button>

      <AlertDialog open={resolveOpen} onOpenChange={(o) => !pending && setResolveOpen(o)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="icon-badge icon-badge-primary h-11 w-11"><Gavel className="h-5 w-5" /></div>
            <AlertDialogTitle>Resolve appeal</AlertDialogTitle>
            <AlertDialogDescription>
              {appeal.subjectName} — this records the outcome. Overturning does not automatically reverse the original decision; use the shortcut this row shows afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Outcome *</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as "UPHELD" | "OVERTURNED")}>
                <SelectTrigger className="w-full rounded-xl text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="UPHELD">Upheld — original decision stands</SelectItem>
                  <SelectItem value="OVERTURNED">Overturned — original decision reversed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Resolution note (optional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Grounds for the decision…" className="min-h-20 text-sm" />
            </div>
          </div>
          <AlertDialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setResolveOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="button" className="rounded-full gap-1.5" disabled={pending} onClick={doResolve}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? "Saving…" : "Confirm"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
