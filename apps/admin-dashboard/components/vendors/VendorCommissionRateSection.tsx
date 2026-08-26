"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Percent, Pencil, History } from "lucide-react"
import { Button } from "@repo/ui/components/button"
import { Label } from "@repo/ui/components/label"
import { Input } from "@repo/ui/components/input"
import { Textarea } from "@repo/ui/components/textarea"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@repo/ui/components/alert-dialog"
import type { CommissionRateHistoryEntry } from "@/types"

interface Props {
  vendorId: string
  currentRate: number | null
  history: CommissionRateHistoryEntry[]
  canManage: boolean
}

/**
 * Roadmap Phase 2 (CLAUDE.md) — commissionRate had no admin action to
 * change it anywhere in the codebase and no record of past values. Every
 * change here writes a VendorCommissionRateHistory row server-side in the
 * same transaction as the live value.
 */
export function VendorCommissionRateSection({ vendorId, currentRate, history, canManage }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [rate, setRate] = useState(currentRate?.toString() ?? "")
  const [reason, setReason] = useState("")
  const [pending, setPending] = useState(false)

  async function submit() {
    const parsed = Number(rate)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return
    setPending(true)
    try {
      const res = await fetch(`/api/vendors/accounts/${vendorId}/commission-rate`, {
        method : "PATCH",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ newRate: parsed, reason: reason.trim() || undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Commission rate updated")
        setOpen(false)
        router.refresh()
      } else {
        toast.error("Failed to update", { description: data.message })
      }
    } catch {
      toast.error("Network error", { description: "Please try again." })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="admin-card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Commission Rate</h2>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <Button type="button" variant="ghost" size="sm" className="rounded-full gap-1.5 text-muted-foreground" onClick={() => setShowHistory((v) => !v)}>
              <History className="h-3.5 w-3.5" />
              {showHistory ? "Hide history" : `History (${history.length})`}
            </Button>
          )}
          {canManage && (
            <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5" onClick={() => { setRate(currentRate?.toString() ?? ""); setReason(""); setOpen(true) }}>
              <Pencil className="h-3.5 w-3.5" />
              Change
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="icon-badge icon-badge-primary h-10 w-10">
          <Percent className="h-4.5 w-4.5" />
        </div>
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {currentRate != null ? `${currentRate}%` : "Not set"}
        </p>
      </div>

      {showHistory && (
        <ul className="divide-y divide-border/60 pt-1">
          {history.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 py-2 text-xs">
              <div className="min-w-0">
                <p className="text-foreground">
                  {h.previousRate != null ? `${h.previousRate}% → ` : ""}<span className="font-medium">{h.newRate}%</span>
                </p>
                {h.reason && <p className="truncate text-muted-foreground">{h.reason}</p>}
              </div>
              <div className="shrink-0 text-right text-muted-foreground">
                <p>{h.changedByAdminName ?? "—"}</p>
                <p className="font-mono">{new Date(h.createdAt).toLocaleDateString()}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="icon-badge icon-badge-primary h-11 w-11"><Percent className="h-5 w-5" /></div>
            <AlertDialogTitle>Change commission rate</AlertDialogTitle>
            <AlertDialogDescription>
              This is recorded in the rate history below — the previous rate isn&apos;t lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">New rate (%) *</Label>
              <Input type="number" min={0} max={100} step={0.1} value={rate} onChange={(e) => setRate(e.target.value)} className="rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reason (optional)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this rate is changing…" className="min-h-16 text-sm" />
            </div>
          </div>
          <AlertDialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="button" className="rounded-full gap-1.5" disabled={pending || rate.trim() === ""} onClick={submit}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
