"use client"

import * as React from "react"
import { toast } from "sonner"
import { Loader2, Plus, ShieldCheck, Star, Trash2, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  usePayoutAccounts, usePayoutMethods, useSetDefaultPayoutAccount, useRemovePayoutAccount,
} from "@/lib/queries/payout"
import { ClientApiError } from "@/lib/api/client"
import { PayoutForm } from "./PayoutForm"
import type { VendorPayoutAccount } from "@repo/types/vendor-app"

/*
 * The /setup/payout body. Lists the vendor's existing payout accounts
 * (masked identifiers only — the backend never returns the real numbers)
 * and hosts the add-account form inline on the page. Supports exactly what
 * the backend supports today: add, set-default (verified accounts only),
 * remove. There is no edit — identifiers are encrypted at rest, so a
 * change means remove + re-add.
 */

const STATUS_BADGE: Record<VendorPayoutAccount["verificationStatus"], { label: string; className: string }> = {
  PENDING        : { label: "Pending verification", className: "bg-muted text-muted-foreground" },
  VERIFIED       : { label: "Verified", className: "bg-success-bg text-success" },
  FAILED         : { label: "Verification failed", className: "bg-destructive-bg text-destructive" },
  REQUIRES_REVIEW: { label: "Under review", className: "bg-warning-bg text-warning" },
}

// §16 — one clear sentence about what state the account is in and what (if
// anything) the vendor should do. Backend state is authoritative; this only
// renders it.
const STATUS_MESSAGE: Record<VendorPayoutAccount["verificationStatus"], string> = {
  VERIFIED       : "This account is verified and ready to receive payouts.",
  PENDING        : "We're verifying this account. You can keep setting up in the meantime — it can't receive payouts until it's verified.",
  REQUIRES_REVIEW: "This account needs a manual review before it can be used. We'll let you know once it's done.",
  FAILED         : "We couldn't verify this bank account. Check the bank and account details, then remove it and add it again.",
}

function accountIdentifier(a: VendorPayoutAccount): string {
  return (
    a.masked?.mobileNumber ??
    a.masked?.accountNumber ??
    a.masked?.iban ??
    a.paypalEmail ??
    a.stripeAccountId ??
    "—"
  )
}

export function PayoutPanel() {
  const { data: accounts, isLoading: accountsLoading } = usePayoutAccounts()
  const { data: methods, isLoading: methodsLoading } = usePayoutMethods()
  const setDefault = useSetDefaultPayoutAccount()
  const remove = useRemovePayoutAccount()

  const [adding, setAdding] = React.useState(false)

  const hasAccounts = !!accounts?.length
  const hasVerified = !!accounts?.some((a) => a.verificationStatus === "VERIFIED")
  // Show the add form whenever there's no verified account yet — so a vendor
  // stuck on a FAILED / PENDING account has an obvious way forward (§7/§16).
  const showForm = adding || !hasVerified

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

  if (accountsLoading || methodsLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Existing accounts */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Your payout accounts</h2>
          {hasVerified && !adding && (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus className="size-3.5" /> Add account
            </Button>
          )}
        </div>

        {!hasAccounts ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
            <Wallet className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No payout accounts yet — add one below.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {accounts!.map((a) => {
              const badge = STATUS_BADGE[a.verificationStatus]
              return (
                <li
                  key={a.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4",
                    a.isDefault ? "border-primary/40" : "border-border",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {a.countryPaymentMethod.paymentMethod.name}
                      </p>
                      {a.isDefault && (
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          <Star className="mr-1 size-2.5" /> Default
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">{accountIdentifier(a)}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", badge.className)}>
                        {badge.label}
                      </span>
                    </div>
                    <p className={cn(
                      "mt-1 text-xs",
                      a.verificationStatus === "FAILED" ? "text-destructive"
                        : a.verificationStatus === "VERIFIED" ? "text-success"
                          : "text-muted-foreground",
                    )}>
                      {a.failureReason && a.verificationStatus !== "VERIFIED"
                        ? a.failureReason
                        : STATUS_MESSAGE[a.verificationStatus]}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {!a.isDefault && a.verificationStatus === "VERIFIED" && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleSetDefault(a.id)} disabled={setDefault.isPending}>
                        {setDefault.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
                        Make default
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(a.id)}
                      disabled={remove.isPending}
                      aria-label={`Remove ${a.countryPaymentMethod.paymentMethod.name} account`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Add form */}
      {showForm && (
        <section className="space-y-3 rounded-xl border border-border bg-card p-5 sm:p-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Add a payout account</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              This is where we send your earnings. New accounts stay pending until verified.
            </p>
          </div>
          <PayoutForm
            methods={methods ?? []}
            onSuccess={() => setAdding(false)}
            onCancel={hasVerified ? () => setAdding(false) : undefined}
          />
        </section>
      )}
    </div>
  )
}
