"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, ShieldCheck, ShieldX, Landmark, Star, AlertTriangle } from "lucide-react"
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
import { EmptyState } from "@/components/shared/EmptyState"
import type { VendorPayoutAccount } from "@/types"

interface Props {
  vendorId: string
  accounts: VendorPayoutAccount[]
  canManage: boolean
}

const STATUS_BADGE: Record<VendorPayoutAccount["verificationStatus"], string> = {
  VERIFIED       : "badge-success",
  PENDING        : "badge-warning",
  REQUIRES_REVIEW: "badge-warning",
  FAILED         : "badge-danger",
}
const STATUS_LABEL: Record<VendorPayoutAccount["verificationStatus"], string> = {
  VERIFIED       : "Verified",
  PENDING        : "Pending",
  REQUIRES_REVIEW: "Requires review",
  FAILED         : "Failed",
}

function accountIdentifier(a: VendorPayoutAccount): string {
  if (a.accountNumber) return `${a.bankName ?? "Bank"} •••• ${a.accountNumber.slice(-4)}`
  if (a.mobileNumber) return `${a.mobileNetwork ?? "Mobile money"} — ${a.mobileNumber}`
  if (a.paypalEmail) return `PayPal — ${a.paypalEmail}`
  if (a.stripeAccountId) return `Stripe — ${a.stripeAccountId}`
  return "No identifier on file"
}

/**
 * Roadmap Phase 1 (CLAUDE.md) — the manual-verify path for payout accounts.
 * addPayoutAccount always creates a PENDING account; nothing else in the
 * system ever moved one to VERIFIED before this, so a vendor could never
 * actually get paid. Verify/Reject here call the new admin endpoints
 * directly; a real provider integration is a separate future item.
 */
export function VendorPayoutAccountsSection({ vendorId, accounts, canManage }: Props) {
  const router = useRouter()
  const [rejectTarget, setRejectTarget] = useState<VendorPayoutAccount | null>(null)
  const [reason, setReason] = useState("")
  const [pending, setPending] = useState<string | null>(null)

  async function doVerify(accountId: string) {
    setPending(accountId)
    try {
      const res = await fetch(`/api/vendors/accounts/${vendorId}/payout-accounts/${accountId}/verify`, { method: "POST" })
      const data = await res.json()
      if (res.ok) { toast.success("Payout account verified"); router.refresh() }
      else toast.error("Failed to verify", { description: data.message })
    } catch {
      toast.error("Network error", { description: "Please try again." })
    } finally {
      setPending(null)
    }
  }

  async function doReject() {
    if (!rejectTarget || !reason.trim()) return
    setPending(rejectTarget.id)
    try {
      const res = await fetch(`/api/vendors/accounts/${vendorId}/payout-accounts/${rejectTarget.id}/reject`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ reason: reason.trim() }),
      })
      const data = await res.json()
      if (res.ok) { toast.success("Payout account rejected"); setRejectTarget(null); router.refresh() }
      else toast.error("Failed to reject", { description: data.message })
    } catch {
      toast.error("Network error", { description: "Please try again." })
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="admin-card space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Payout Accounts</h2>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No payout accounts"
          description="This vendor hasn't added a bank, mobile money, or wallet account yet — they can't receive payouts until they do."
        />
      ) : (
        <ul className="divide-y divide-border/60">
          {accounts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="icon-badge icon-badge-info h-9 w-9 shrink-0">
                  <Landmark className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                    {accountIdentifier(a)}
                    {a.isDefault && <Star className="h-3 w-3 shrink-0 fill-warning text-warning" />}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.countryPaymentMethod.paymentMethod.name}
                    {a.failureReason && a.verificationStatus === "FAILED" ? ` — ${a.failureReason}` : ""}
                  </p>
                  {a.duplicateElsewhere > 0 && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-warning">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      Also used by {a.duplicateElsewhere} other vendor{a.duplicateElsewhere === 1 ? "" : "s"} in this country
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={STATUS_BADGE[a.verificationStatus]}>{STATUS_LABEL[a.verificationStatus]}</span>
                {canManage && a.verificationStatus !== "VERIFIED" && (
                  <Button
                    type="button" variant="outline" size="sm" className="rounded-full gap-1.5"
                    disabled={pending !== null} onClick={() => doVerify(a.id)}
                  >
                    {pending === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    Verify
                  </Button>
                )}
                {canManage && a.verificationStatus !== "FAILED" && (
                  <Button
                    type="button" variant="outline" size="sm" className="rounded-full gap-1.5 text-destructive hover:bg-destructive-bg"
                    disabled={pending !== null} onClick={() => { setReason(""); setRejectTarget(a) }}
                  >
                    <ShieldX className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!rejectTarget} onOpenChange={(o) => !pending && !o && setRejectTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="icon-badge icon-badge-danger h-11 w-11"><ShieldX className="h-5 w-5" /></div>
            <AlertDialogTitle>Reject payout account</AlertDialogTitle>
            <AlertDialogDescription>
              {rejectTarget && accountIdentifier(rejectTarget)} will be marked as failed verification. The vendor will need to fix and resubmit it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this account failed verification…" className="min-h-20 text-sm" />
          </div>
          <AlertDialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setRejectTarget(null)} disabled={pending !== null}>Cancel</Button>
            <Button type="button" variant="destructive" className="rounded-full gap-1.5" disabled={pending !== null || !reason.trim()} onClick={doReject}>
              {pending === rejectTarget?.id && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Reject
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
