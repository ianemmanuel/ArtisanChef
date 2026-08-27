"use client"

import { toast } from "sonner"
import { Loader2, Star, Trash2, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { usePayoutAccounts, useSetDefaultPayoutAccount, useRemovePayoutAccount } from "@/lib/queries/payout"
import { AddPayoutAccountDialog } from "./AddPayoutAccountDialog"
import { ClientApiError } from "@/lib/api/client"
import type { VendorPayoutAccount } from "@repo/types/vendor-app"

const STATUS_BADGE: Record<VendorPayoutAccount["verificationStatus"], { label: string; className: string }> = {
  PENDING        : { label: "Pending verification", className: "bg-muted text-muted-foreground" },
  VERIFIED       : { label: "Verified", className: "bg-success-bg text-success" },
  FAILED         : { label: "Verification failed", className: "bg-destructive-bg text-destructive" },
  REQUIRES_REVIEW: { label: "Needs review", className: "bg-warning-bg text-warning" },
}

function accountIdentifier(a: VendorPayoutAccount): string {
  if (a.mobileNumber) return a.mobileNumber
  if (a.accountNumber) return `•••• ${a.accountNumber.slice(-4)}`
  if (a.paypalEmail) return a.paypalEmail
  if (a.stripeAccountId) return a.stripeAccountId
  return "—"
}

export function PayoutAccountsSection() {
  const { data: accounts, isLoading } = usePayoutAccounts()
  const setDefault = useSetDefaultPayoutAccount()
  const remove = useRemovePayoutAccount()

  async function handleSetDefault(id: string) {
    try {
      await setDefault.mutateAsync(id)
      toast.success("Default payout account updated")
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Failed to update default account")
    }
  }

  async function handleRemove(id: string) {
    try {
      await remove.mutateAsync(id)
      toast.success("Payout account removed")
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Failed to remove account")
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {accounts?.length ? "Where we send your earnings." : "Add an account so we know where to send your earnings."}
        </p>
        <AddPayoutAccountDialog />
      </div>

      {!accounts?.length ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
          <Wallet className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No payout accounts yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => {
            const badge = STATUS_BADGE[a.verificationStatus]
            return (
              <div key={a.id} className={cn("flex items-center justify-between gap-4 rounded-xl border bg-card p-4", a.isDefault ? "border-primary/40" : "border-border")}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{a.countryPaymentMethod.paymentMethod.name}</p>
                    {a.isDefault && <Badge variant="outline" className="shrink-0 text-[10px]"><Star className="mr-1 size-2.5" />Default</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">{accountIdentifier(a)}</span>
                    <Badge variant="outline" className={cn("shrink-0 text-[10px]", badge.className)}>{badge.label}</Badge>
                  </div>
                  {a.verificationStatus === "FAILED" && a.failureReason && (
                    <p className="mt-1 text-xs text-destructive">{a.failureReason}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {!a.isDefault && a.verificationStatus === "VERIFIED" && (
                    <Button
                      type="button" variant="ghost" size="sm"
                      onClick={() => handleSetDefault(a.id)}
                      disabled={setDefault.isPending}
                    >
                      {setDefault.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Star className="size-3.5" />} Make default
                    </Button>
                  )}
                  <Button
                    type="button" variant="ghost" size="sm"
                    onClick={() => handleRemove(a.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
