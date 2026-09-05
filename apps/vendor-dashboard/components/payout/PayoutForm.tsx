"use client"

import * as React from "react"
import { toast } from "sonner"
import { Loader2, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { SearchableCombobox } from "@/components/onboarding/SearchableCombobox"
import { useAddPayoutAccount, usePayoutBanks } from "@/lib/queries/payout"
import { ClientApiError } from "@/lib/api/client"
import {
  payoutSchemaFor, EMPTY_PAYOUT_FORM, type PayoutFormValues, type PayoutMethodType,
} from "@/lib/validations/payout"
import type { AvailablePayoutMethod, VendorPayoutAccount } from "@repo/types/vendor-app"

/*
 * The payout-account form — a real page-level form, not a dialog. Adds an
 * OUTBOUND payout account for the vendor's country. The visible fields
 * follow the chosen method's type; validation mirrors the backend's
 * per-type minimums (lib/validations/payout.ts).
 *
 * Verification (Vendor 1D) can resolve synchronously — a bank account may
 * come back VERIFIED, FAILED, or REQUIRES_REVIEW in the same request that
 * created it, not just PENDING — so the confirmation reflects whatever the
 * backend actually decided rather than a single generic message.
 */

const SUCCESS_TOAST: Record<VendorPayoutAccount["verificationStatus"], [string, { description: string }]> = {
  VERIFIED: [
    "Payout account verified",
    { description: "This account is ready to receive payouts." },
  ],
  PENDING: [
    "Payout account added",
    { description: "We'll verify it shortly — you can keep going with setup in the meantime." },
  ],
  REQUIRES_REVIEW: [
    "Payout account added",
    { description: "We're reviewing this account and will let you know once it's ready." },
  ],
  FAILED: [
    "Payout account added",
    { description: "We couldn't verify it automatically — double-check the details or try a different account." },
  ],
}

interface Props {
  methods  : AvailablePayoutMethod[]
  onSuccess?: () => void
  onCancel? : () => void
}

function Field({
  label, htmlFor, error, hint, children,
}: {
  label: string; htmlFor: string; error?: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

/*
 * Vendor 1E — bank selection for the BANK method. Prefers the searchable
 * combobox (fed by Finance's provider-specific BANK_LIST capability, via
 * usePayoutBanks) so the vendor picks from real supported banks and the
 * exact provider bank code — not just a display name — is what gets
 * submitted. Falls back to manual bank name + bank code entry (same fields
 * this form had before Vendor 1E) whenever the list can't be shown: still
 * loading is handled by disabling the combobox, not this fallback — the
 * fallback is only for "the list genuinely isn't available" (fetch failed,
 * or the vendor's country has no bank-list capability configured yet).
 * Never fabricates bank data and never presents an empty selector that
 * would silently accept an unvalidated code.
 */
function BankField({
  bankCode, bankName, error, onSelectBank, onManualBankName, onManualBankCode,
}: {
  bankCode?: string
  bankName?: string
  error?: string
  onSelectBank: (code: string, name: string) => void
  onManualBankName: (value: string) => void
  onManualBankCode: (value: string) => void
}) {
  const { data, isLoading, isError } = usePayoutBanks(true)
  const banks = data?.banks ?? []
  const useManualEntry = !isLoading && (isError || !data?.supported || banks.length === 0)

  if (useManualEntry) {
    return (
      <div className="space-y-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bank name" htmlFor="bank" error={error}>
            <Input id="bank" value={bankName ?? ""} onChange={(e) => onManualBankName(e.target.value)} />
          </Field>
          <Field label="Bank code" htmlFor="bankcode" hint="Provided by your bank.">
            <Input id="bankcode" value={bankCode ?? ""} onChange={(e) => onManualBankCode(e.target.value)} />
          </Field>
        </div>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          {isError
            ? "We couldn't load the list of supported banks — enter your bank details manually."
            : "A bank list isn't available for your country yet — enter your bank details manually."}
        </p>
      </div>
    )
  }

  return (
    <Field label="Bank" htmlFor="bank-select" error={error} hint={bankCode ? `Bank code: ${bankCode}` : undefined}>
      <SearchableCombobox
        aria-label="Bank"
        options={banks.map((b) => ({ value: b.code, label: b.name }))}
        value={bankCode || undefined}
        onChange={(code) => {
          const bank = banks.find((b) => b.code === code)
          onSelectBank(code, bank?.name ?? "")
        }}
        placeholder="Select your bank…"
        searchPlaceholder="Search banks…"
        emptyText="No matching bank."
        loading={isLoading}
      />
    </Field>
  )
}

export function PayoutForm({ methods, onSuccess, onCancel }: Props) {
  const [form, setForm] = React.useState<PayoutFormValues>(EMPTY_PAYOUT_FORM)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const addAccount = useAddPayoutAccount()

  const selectedMethod = methods.find((m) => m.id === form.countryPaymentMethodId)
  const methodType = selectedMethod?.paymentMethod.type as PayoutMethodType | undefined

  function set<K extends keyof PayoutFormValues>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: "" } : e))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = payoutSchemaFor(methodType).safeParse(form)
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form")
        if (!next[key]) next[key] = issue.message
      }
      setErrors(next)
      return
    }

    try {
      const account = await addAccount.mutateAsync(parsed.data)
      // Verification often resolves synchronously now (Vendor 1D — automatic
      // provider-backed checks for bank accounts), so the toast reflects
      // what actually happened rather than always saying "pending".
      toast.success(...SUCCESS_TOAST[account.verificationStatus])
      setForm(EMPTY_PAYOUT_FORM)
      setErrors({})
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Failed to add payout account")
    }
  }

  if (methods.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        No payout methods are available for your country yet. Once the platform enables one, you&apos;ll be able to add an account here.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <Field label="Payout method" htmlFor="payout-method" error={errors.countryPaymentMethodId}>
        <Select value={form.countryPaymentMethodId} onValueChange={(v) => set("countryPaymentMethodId", v)}>
          <SelectTrigger id="payout-method"><SelectValue placeholder="Choose a method" /></SelectTrigger>
          <SelectContent>
            {methods.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.paymentMethod.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {form.countryPaymentMethodId && (
        <>
          <Field
            label="Account holder name"
            htmlFor="holder"
            error={errors.accountHolderName}
            hint="Use the name exactly as it appears on the account."
          >
            <Input id="holder" value={form.accountHolderName} onChange={(e) => set("accountHolderName", e.target.value)} placeholder="e.g. Jane Wanjiku" />
          </Field>

          {methodType === "MOBILE_MONEY" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mobile network" htmlFor="net" hint="e.g. M-Pesa, Airtel Money">
                <Input id="net" value={form.mobileNetwork} onChange={(e) => set("mobileNetwork", e.target.value)} />
              </Field>
              <Field label="Mobile number" htmlFor="msisdn" error={errors.mobileNumber}>
                <Input id="msisdn" inputMode="tel" value={form.mobileNumber} onChange={(e) => set("mobileNumber", e.target.value)} placeholder="07XX XXX XXX" />
              </Field>
            </div>
          )}

          {methodType === "BANK" && (
            <>
              <BankField
                bankCode={form.bankCode}
                bankName={form.bankName}
                error={errors.bankName}
                onSelectBank={(code, name) => { set("bankCode", code); set("bankName", name) }}
                onManualBankName={(v) => set("bankName", v)}
                onManualBankCode={(v) => set("bankCode", v)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Branch" htmlFor="branch">
                  <Input id="branch" value={form.branchName} onChange={(e) => set("branchName", e.target.value)} />
                </Field>
                <Field label="Account number" htmlFor="acct" error={errors.accountNumber}>
                  <Input id="acct" value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="SWIFT / BIC" htmlFor="swift"><Input id="swift" value={form.swiftCode} onChange={(e) => set("swiftCode", e.target.value)} /></Field>
                <Field label="IBAN" htmlFor="iban"><Input id="iban" value={form.iban} onChange={(e) => set("iban", e.target.value)} /></Field>
              </div>
              <Field label="Routing number" htmlFor="routing" hint="Only if your bank uses one.">
                <Input id="routing" value={form.routingNumber} onChange={(e) => set("routingNumber", e.target.value)} />
              </Field>
            </>
          )}

          {methodType === "DIGITAL_WALLET" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="PayPal email" htmlFor="paypal" error={errors.paypalEmail}>
                <Input id="paypal" type="email" value={form.paypalEmail} onChange={(e) => set("paypalEmail", e.target.value)} />
              </Field>
              <Field label="Stripe account ID" htmlFor="stripe">
                <Input id="stripe" value={form.stripeAccountId} onChange={(e) => set("stripeAccountId", e.target.value)} placeholder="acct_..." />
              </Field>
            </div>
          )}

          {methodType === "CARD" && (
            <p className="text-xs text-muted-foreground">
              Card payouts only need the account holder name here — the rest is handled during verification.
            </p>
          )}
        </>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={addAccount.isPending || !form.countryPaymentMethodId}>
          {addAccount.isPending && <Loader2 className="size-4 animate-spin" />} Add account
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={addAccount.isPending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
