"use client"

import * as React from "react"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { usePayoutMethods, useAddPayoutAccount } from "@/lib/queries/payout"
import { ClientApiError } from "@/lib/api/client"
import type { AddPayoutAccountRequest } from "@repo/types/vendor-app"

const EMPTY_FORM: Omit<AddPayoutAccountRequest, "countryPaymentMethodId"> = {
  accountHolderName: "",
  mobileNetwork: "", mobileNumber: "",
  bankName: "", branchName: "", bankCode: "", accountNumber: "", swiftCode: "", iban: "", routingNumber: "",
  paypalEmail: "", stripeAccountId: "",
}

export function AddPayoutAccountDialog() {
  const [open, setOpen] = React.useState(false)
  const [methodId, setMethodId] = React.useState<string>("")
  const [form, setForm] = React.useState(EMPTY_FORM)

  const { data: methods, isLoading: methodsLoading } = usePayoutMethods()
  const addAccount = useAddPayoutAccount()

  const selectedMethod = methods?.find((m) => m.id === methodId)
  const methodType = selectedMethod?.paymentMethod.type

  function setField<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function reset() {
    setMethodId("")
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!methodId) { toast.error("Choose a payout method"); return }
    if (!form.accountHolderName?.trim()) { toast.error("Account holder name is required"); return }

    if (methodType === "MOBILE_MONEY" && !form.mobileNumber?.trim()) {
      toast.error("Mobile number is required"); return
    }
    if (methodType === "BANK" && (!form.bankName?.trim() || !form.accountNumber?.trim())) {
      toast.error("Bank name and account number are required"); return
    }
    if (methodType === "DIGITAL_WALLET" && !form.paypalEmail?.trim() && !form.stripeAccountId?.trim()) {
      toast.error("A wallet identifier is required"); return
    }

    try {
      await addAccount.mutateAsync({ countryPaymentMethodId: methodId, ...form })
      toast.success("Payout account added — pending verification")
      setOpen(false)
      reset()
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Failed to add payout account")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-3.5" /> Add payout account</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a payout account</DialogTitle>
          <DialogDescription>This is where we'll send your earnings. New accounts start as pending until verified.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Payout method</Label>
            <Select value={methodId} onValueChange={setMethodId} disabled={methodsLoading}>
              <SelectTrigger><SelectValue placeholder={methodsLoading ? "Loading…" : "Choose a method"} /></SelectTrigger>
              <SelectContent>
                {methods?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.paymentMethod.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {methods?.length === 0 && !methodsLoading && (
              <p className="text-xs text-muted-foreground">No payout methods are configured for your country yet.</p>
            )}
          </div>

          {methodId && (
            <>
              <div className="space-y-1.5">
                <Label>Account holder name</Label>
                <Input value={form.accountHolderName} onChange={(e) => setField("accountHolderName", e.target.value)} placeholder="Name on the account" />
              </div>

              {methodType === "MOBILE_MONEY" && (
                <>
                  <div className="space-y-1.5">
                    <Label>Mobile network</Label>
                    <Input value={form.mobileNetwork} onChange={(e) => setField("mobileNetwork", e.target.value)} placeholder="e.g. M-Pesa, Airtel" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mobile number</Label>
                    <Input value={form.mobileNumber} onChange={(e) => setField("mobileNumber", e.target.value)} placeholder="e.g. 0712345678" />
                  </div>
                </>
              )}

              {methodType === "BANK" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Bank name</Label>
                      <Input value={form.bankName} onChange={(e) => setField("bankName", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Branch</Label>
                      <Input value={form.branchName} onChange={(e) => setField("branchName", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Account number</Label>
                    <Input value={form.accountNumber} onChange={(e) => setField("accountNumber", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label>Bank code</Label>
                      <Input value={form.bankCode} onChange={(e) => setField("bankCode", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>SWIFT</Label>
                      <Input value={form.swiftCode} onChange={(e) => setField("swiftCode", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>IBAN</Label>
                      <Input value={form.iban} onChange={(e) => setField("iban", e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {methodType === "DIGITAL_WALLET" && (
                <>
                  <div className="space-y-1.5">
                    <Label>PayPal email</Label>
                    <Input type="email" value={form.paypalEmail} onChange={(e) => setField("paypalEmail", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Stripe account ID</Label>
                    <Input value={form.stripeAccountId} onChange={(e) => setField("stripeAccountId", e.target.value)} />
                  </div>
                </>
              )}
            </>
          )}

          <DialogFooter>
            <Button type="submit" disabled={addAccount.isPending || !methodId}>
              {addAccount.isPending && <Loader2 className="size-4 animate-spin" />} Add account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
