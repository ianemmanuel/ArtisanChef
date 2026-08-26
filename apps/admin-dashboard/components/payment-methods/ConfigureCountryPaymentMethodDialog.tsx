"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@repo/ui/components/button"
import { Label } from "@repo/ui/components/label"
import { Input } from "@repo/ui/components/input"
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
import type { PaymentMethod, PaymentDirection } from "@/types"

interface Props {
  countryId: string
  /** Active global catalog entries — the pool this dialog can configure. */
  methods: PaymentMethod[]
}

/**
 * Configure a payment method for this country — either direction the
 * method supports. Reuses createOrReactivate semantics server-side
 * (configureCountryPaymentMethod) so re-configuring a previously
 * deactivated combination just reactivates it in place.
 */
export function ConfigureCountryPaymentMethodDialog({ countryId, methods }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethodId, setPaymentMethodId] = useState("")
  const [direction, setDirection] = useState<PaymentDirection | "">("")
  const [verificationProvider, setVerificationProvider] = useState("")
  const [accountDetailsRaw, setAccountDetailsRaw] = useState("")

  const selectedMethod = methods.find((m) => m.id === paymentMethodId)
  const availableDirections = selectedMethod?.direction ?? []

  function reset() {
    setPaymentMethodId(""); setDirection(""); setVerificationProvider(""); setAccountDetailsRaw(""); setError(null)
  }

  async function submit() {
    if (!paymentMethodId || !direction) return
    setError(null)

    let ourAccountDetails: Record<string, unknown> | undefined
    if (accountDetailsRaw.trim()) {
      try {
        ourAccountDetails = JSON.parse(accountDetailsRaw)
      } catch {
        setError("Account details must be valid JSON, e.g. {\"paybill\": \"123456\"}")
        return
      }
    }

    setPending(true)
    try {
      const res = await fetch("/api/payment-methods/country-config", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({
          countryId, paymentMethodId, direction,
          verificationProvider: verificationProvider.trim() || undefined,
          ourAccountDetails,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Payment method configured")
        setOpen(false)
        reset()
        router.refresh()
      } else {
        setError(data.message ?? "Something went wrong.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
      <Button type="button" size="sm" className="gap-1.5 rounded-full" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Configure Method
      </Button>

      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Configure payment method</AlertDialogTitle>
          <AlertDialogDescription>
            Enables this method for this country in the direction chosen — customers can pay with it (Inbound) or vendors can be paid out with it (Outbound).
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-1.5">
            <Label className="text-xs">Payment method *</Label>
            <Select value={paymentMethodId} onValueChange={(v) => { setPaymentMethodId(v); setDirection("") }}>
              <SelectTrigger className="w-full rounded-xl text-sm"><SelectValue placeholder={methods.length === 0 ? "No active payment methods in the catalog" : "Select…"} /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {methods.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Direction *</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as PaymentDirection)} disabled={!selectedMethod}>
              <SelectTrigger className="w-full rounded-xl text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {availableDirections.includes("INBOUND") && <SelectItem value="INBOUND">Inbound — customer payments</SelectItem>}
                {availableDirections.includes("OUTBOUND") && <SelectItem value="OUTBOUND">Outbound — vendor payouts</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Verification provider (optional)</Label>
            <Input placeholder="e.g. SAFARICOM_DARAJA, MANUAL" value={verificationProvider} onChange={(e) => setVerificationProvider(e.target.value)} className="rounded-xl text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Our account details (optional, JSON)</Label>
            <Textarea placeholder='{"paybill": "123456"}' value={accountDetailsRaw} onChange={(e) => setAccountDetailsRaw(e.target.value)} className="min-h-20 font-mono text-sm" />
            <p className="text-xs text-muted-foreground">Our own collection/disbursement details for this rail — shape varies by method (paybill, account number, etc).</p>
          </div>
        </div>

        <AlertDialogFooter>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button type="button" className="rounded-full gap-1.5" disabled={pending || !paymentMethodId || !direction} onClick={submit}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? "Saving…" : "Configure"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
