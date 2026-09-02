"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Loader2, CheckCircle2, XCircle, ShieldCheck, Landmark, Wallet, ArrowDownToLine, ArrowUpFromLine,
  Plus, Power, PauseCircle, Ban, Plug, PlugZap,
} from "lucide-react"
import { Button } from "@repo/ui/components/button"
import { Label } from "@repo/ui/components/label"
import { Input } from "@repo/ui/components/input"
import { Switch } from "@repo/ui/components/switch"
import { Checkbox } from "@repo/ui/components/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui/components/select"
import {
  PAYMENT_PROVIDER_CAPABILITIES,
  FINANCIAL_READINESS_REASON_LABELS,
  type CountryFinancialConfigView,
  type CountryProviderAccount,
  type CountryPaymentMethodWithProvider,
  type ProviderGatewayStatus,
  type PaymentProvider,
  type Currency,
  type PaymentProviderCapability,
  type ReadinessCheck,
} from "@repo/types/admin-app"

interface Props {
  countrySlug: string
  countryName: string
  countryStatus: string
  legacyCurrency: string
  view: CountryFinancialConfigView
  providers: PaymentProvider[]
  currencies: Currency[]
}

const CAP_LABEL = (c: string) => c.replace(/_/g, " ").toLowerCase()

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "badge-neutral", ACTIVE: "badge-success", SUSPENDED: "badge-warning", DISABLED: "badge-neutral",
}

export function CountryFinancialConfigManager({
  countrySlug, countryName, countryStatus, legacyCurrency, view, providers, currencies,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)

  const { config, providerAccounts, readiness, providerGateway, paymentMethods, canManageDraft, canManageLifecycle } = view
  const configStatus = config?.status ?? "NONE"

  async function call(url: string, method: "POST" | "PATCH", body?: unknown, key = url) {
    setBusy(key)
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(data.message ?? "Done")
        startTransition(() => router.refresh())
      } else {
        toast.error(data.message ?? "Action failed")
      }
      return res.ok
    } catch {
      toast.error("Network error")
      return false
    } finally {
      setBusy(null)
    }
  }

  const base = `/api/finance/countries/${countrySlug}/financial-config`
  const isBusy = (k: string) => busy === k || pending

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="admin-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="icon-badge icon-badge-primary h-12 w-12"><Landmark className="h-5 w-5" /></div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">{countryName} — Finance</h1>
            <p className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
              Config status: <span className={STATUS_BADGE[configStatus] ?? "badge-neutral"}>{configStatus}</span>
              <span className="text-xs">· country is {countryStatus}</span>
            </p>
          </div>
        </div>
        {config && canManageLifecycle && (
          <div className="flex flex-wrap gap-2">
            {configStatus !== "ACTIVE" && configStatus !== "DISABLED" && (
              <Button size="sm" className="gap-1.5 rounded-full" disabled={isBusy("cfg-activate")}
                onClick={() => call(`${base}/activate`, "POST", undefined, "cfg-activate")}>
                {isBusy("cfg-activate") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                Activate config
              </Button>
            )}
            {configStatus === "ACTIVE" && (
              <Button size="sm" variant="outline" className="gap-1.5 rounded-full text-warning border-warning/30" disabled={isBusy("cfg-suspend")}
                onClick={() => {
                  const reason = window.prompt("Reason for suspending this country's financial configuration?")
                  if (reason && reason.trim().length >= 3) call(`${base}/suspend`, "POST", { reason: reason.trim() }, "cfg-suspend")
                }}>
                <PauseCircle className="h-4 w-4" /> Suspend
              </Button>
            )}
            {configStatus !== "DISABLED" && (
              <Button size="sm" variant="outline" className="gap-1.5 rounded-full text-destructive border-destructive/30" disabled={isBusy("cfg-disable")}
                onClick={() => {
                  if (window.confirm("Disable this country's financial configuration? Existing records are preserved; new operations are blocked."))
                    call(`${base}/disable`, "POST", undefined, "cfg-disable")
                }}>
                <Ban className="h-4 w-4" /> Disable
              </Button>
            )}
          </div>
        )}
      </div>

      {/* No config yet */}
      {!config && (
        <div className="admin-card flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            This country has no financial configuration yet.
          </p>
          {canManageDraft ? (
            <Button size="sm" className="gap-1.5 rounded-full" disabled={isBusy("create")}
              onClick={() => call(base, "POST", undefined, "create")}>
              {isBusy("create") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create financial configuration (DRAFT)
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">You don&apos;t have permission to create it.</p>
          )}
        </div>
      )}

      {config && (
        <>
          {/* Readiness */}
          <div className="admin-card space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Financial readiness</h2>
              <span className={readiness.financiallyReady ? "badge-success" : "badge-warning"}>
                {readiness.financiallyReady ? "Ready" : "Not ready"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              A country cannot be activated until it is financially ready — collection <em>and</em> payout.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <ReadinessBox title="Collections" icon={ArrowDownToLine} check={readiness.collection} />
              <ReadinessBox title="Payouts" icon={ArrowUpFromLine} check={readiness.payout} />
              <ReadinessBox title="Bank verification" icon={ShieldCheck} check={readiness.bankVerification} />
            </div>
            <ProviderGatewayRow gateway={providerGateway} />
          </div>

          {/* Currency */}
          <div className="admin-card space-y-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Currency</h2>
              {config.currencyCode
                ? <span className="badge-success">{config.currencyCode}</span>
                : <span className="badge-warning">not set</span>}
            </div>
            <p className="text-xs text-muted-foreground">
              Legacy country currency string: <span className="font-mono">{legacyCurrency}</span>.
              {configStatus === "ACTIVE" && " Changing currency on an active config is a structural change (global scope)."}
            </p>
            {canManageDraft && configStatus !== "DISABLED" && (
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={config.currencyCode ?? ""}
                  onValueChange={(v) => call(`${base}/currency`, "PATCH", { currencyCode: v }, "currency")}
                >
                  <SelectTrigger className="w-48 rounded-xl text-sm"><SelectValue placeholder="Select currency" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {currencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isBusy("currency") && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            )}
          </div>

          {/* Provider accounts */}
          <ProviderAccountsSection
            countrySlug={countrySlug}
            accounts={providerAccounts}
            providers={providers}
            activeAccountId={config.activeProviderAccountId}
            configStatus={configStatus}
            canManageDraft={canManageDraft}
            canManageLifecycle={canManageLifecycle}
            call={call}
            isBusy={isBusy}
            base={base}
          />

          {/* Payment method ↔ provider account wiring (Phase 1C) */}
          <PaymentMethodWiringSection
            countrySlug={countrySlug}
            methods={paymentMethods}
            accounts={providerAccounts}
            canManage={canManageDraft}
            configDisabled={configStatus === "DISABLED"}
            call={call}
            isBusy={isBusy}
          />

          {/* Operational switches */}
          <div className="admin-card space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Operational switches</h2>
            <p className="text-xs text-muted-foreground">
              Deliberate &quot;we are collecting / paying out here&quot; decisions. Require an active provider account that
              enables the matching capability.
            </p>
            <SwitchRow
              label="Collections enabled"
              hint="Customer payments"
              checked={config.collectionsEnabled}
              disabled={!canManageDraft || configStatus === "DISABLED" || isBusy("switches")}
              onChange={(v) => call(`${base}/switches`, "PATCH", { collectionsEnabled: v }, "switches")}
            />
            <SwitchRow
              label="Payouts enabled"
              hint="Vendor payouts"
              checked={config.payoutsEnabled}
              disabled={!canManageDraft || configStatus === "DISABLED" || isBusy("switches")}
              onChange={(v) => call(`${base}/switches`, "PATCH", { payoutsEnabled: v }, "switches")}
            />
          </div>
        </>
      )}
    </div>
  )
}

function ReadinessBox({ title, icon: Icon, check }: { title: string; icon: typeof ShieldCheck; check: ReadinessCheck }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">{title}</span>
        {check.ready
          ? <CheckCircle2 className="ml-auto h-4 w-4 text-success" />
          : <XCircle className="ml-auto h-4 w-4 text-warning" />}
      </div>
      {!check.ready && (
        <ul className="mt-2 space-y-1">
          {check.reasons.map((r) => (
            <li key={r} className="text-[11px] leading-tight text-muted-foreground">• {FINANCIAL_READINESS_REASON_LABELS[r]}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ProviderGatewayRow({ gateway }: { gateway: ProviderGatewayStatus }) {
  if (!gateway.configured) return null
  const Dot = ({ ok }: { ok: boolean }) =>
    ok ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5 text-warning" />
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        {gateway.blockers.length === 0 ? <PlugZap className="h-4 w-4 text-success" /> : <Plug className="h-4 w-4 text-warning" />}
        <span className="text-xs font-semibold text-foreground">Provider integration</span>
        <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-mono">
          {gateway.providerCode} · {gateway.environment}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><Dot ok={gateway.adapterRegistered} /> adapter registered</span>
        <span className="flex items-center gap-1"><Dot ok={gateway.credentialsResolvable} /> credentials resolvable</span>
      </div>
      {gateway.blockers.length > 0 && (
        <p className="mt-1.5 text-[11px] text-warning">
          Blockers: {gateway.blockers.map((b) => b.replace(/_/g, " ").toLowerCase()).join(", ")}
        </p>
      )}
    </div>
  )
}

function PaymentMethodWiringSection({
  countrySlug, methods, accounts, canManage, configDisabled, call, isBusy,
}: {
  countrySlug: string
  methods: CountryPaymentMethodWithProvider[]
  accounts: CountryProviderAccount[]
  canManage: boolean
  configDisabled: boolean
  call: (url: string, method: "POST" | "PATCH", body?: unknown, key?: string) => Promise<boolean>
  isBusy: (k: string) => boolean
}) {
  const NONE = "__none__"
  return (
    <div className="admin-card space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Payment method routing</h2>
      <p className="text-xs text-muted-foreground">
        Which provider account executes each payment method for this country. A method must be wired to an account that
        enables the matching capability before it counts toward readiness.
      </p>
      {methods.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No payment methods configured for this country yet — add them under Payment Gateways / the country&apos;s payment-methods page.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {methods.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm text-foreground">
                  {m.direction === "INBOUND"
                    ? <ArrowDownToLine className="h-3.5 w-3.5 text-muted-foreground" />
                    : <ArrowUpFromLine className="h-3.5 w-3.5 text-muted-foreground" />}
                  {m.paymentMethod.name}
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{m.paymentMethod.type}</span>
                  {m.status !== "ACTIVE" && <span className="badge-neutral">{m.status}</span>}
                </p>
                {m.countryProviderAccount && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    via {m.countryProviderAccount.paymentProvider.name} ({m.countryProviderAccount.environment}) ·
                    {" "}{m.countryProviderAccount.status}
                  </p>
                )}
              </div>
              {canManage && !configDisabled ? (
                <Select
                  value={m.countryProviderAccountId ?? NONE}
                  onValueChange={(v) =>
                    call(
                      `/api/finance/countries/${countrySlug}/payment-methods/${m.id}/provider-account`,
                      "PATCH",
                      { countryProviderAccountId: v === NONE ? null : v },
                      `wire-${m.id}`,
                    )
                  }
                >
                  <SelectTrigger className="w-56 rounded-xl text-sm">
                    <SelectValue placeholder="Not wired" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value={NONE}>Not wired</SelectItem>
                    {accounts
                      .filter((a) => a.status !== "DISABLED")
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.paymentProvider?.name ?? a.paymentProviderId} · {a.environment} · {a.status}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {m.countryProviderAccountId ? "wired" : "not wired"}
                </span>
              )}
              {isBusy(`wire-${m.id}`) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SwitchRow({ label, hint, checked, disabled, onChange }: {
  label: string; hint: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5">
      <span>
        <span className="block text-sm text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </label>
  )
}

function ProviderAccountsSection({
  countrySlug, accounts, providers, activeAccountId, configStatus, canManageDraft, canManageLifecycle, call, isBusy, base,
}: {
  countrySlug: string
  accounts: CountryProviderAccount[]
  providers: PaymentProvider[]
  activeAccountId: string | null
  configStatus: string
  canManageDraft: boolean
  canManageLifecycle: boolean
  call: (url: string, method: "POST" | "PATCH", body?: unknown, key?: string) => Promise<boolean>
  isBusy: (k: string) => boolean
  base: string
}) {
  const [adding, setAdding] = useState(false)
  const [providerId, setProviderId] = useState("")
  const [environment, setEnvironment] = useState<"TEST" | "LIVE">("TEST")
  const [secretAlias, setSecretAlias] = useState("")
  const [caps, setCaps] = useState<PaymentProviderCapability[]>([])

  const selectedProvider = providers.find((p) => p.id === providerId)
  const allowedCaps = selectedProvider?.capabilities ?? PAYMENT_PROVIDER_CAPABILITIES

  async function submitNew() {
    const ok = await call(`/api/finance/countries/${countrySlug}/provider-accounts`, "POST", {
      paymentProviderId: providerId,
      environment,
      secretAlias: secretAlias.trim(),
      enabledCapabilities: caps,
    }, "new-account")
    if (ok) { setAdding(false); setProviderId(""); setSecretAlias(""); setCaps([]) }
  }

  return (
    <div className="admin-card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Provider accounts</h2>
        {canManageDraft && configStatus !== "DISABLED" && (
          <Button size="sm" variant="outline" className="gap-1.5 rounded-full" onClick={() => setAdding((v) => !v)}>
            <Plus className="h-3.5 w-3.5" /> {adding ? "Cancel" : "Add account"}
          </Button>
        )}
      </div>

      {adding && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Provider</Label>
              <Select value={providerId} onValueChange={setProviderId}>
                <SelectTrigger className="rounded-xl text-sm"><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Environment</Label>
              <Select value={environment} onValueChange={(v) => setEnvironment(v as "TEST" | "LIVE")}>
                <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="TEST">TEST</SelectItem>
                  <SelectItem value="LIVE">LIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Secret alias</Label>
            <Input value={secretAlias} onChange={(e) => setSecretAlias(e.target.value)} className="rounded-xl font-mono text-sm" placeholder="flutterwave_ke_primary" />
            <p className="text-xs text-muted-foreground">Non-secret pointer — the actual API keys live outside the database.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Enabled capabilities (must be supported by the provider)</Label>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {allowedCaps.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={caps.includes(c)}
                    onCheckedChange={() => setCaps((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c])}
                  />
                  {CAP_LABEL(c)}
                </label>
              ))}
            </div>
          </div>
          <Button size="sm" className="rounded-full" disabled={!providerId || secretAlias.trim().length < 2 || caps.length === 0 || isBusy("new-account")} onClick={submitNew}>
            {isBusy("new-account") && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Create DRAFT account
          </Button>
        </div>
      )}

      {accounts.length === 0 ? (
        <p className="text-xs text-muted-foreground">No provider accounts yet.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {accounts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {a.paymentProvider?.name ?? a.paymentProviderId}
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-mono">{a.environment}</span>
                  <span className={STATUS_BADGE[a.status] ?? "badge-neutral"}>{a.status}</span>
                  {a.id === activeAccountId && <span className="badge-info">active</span>}
                </p>
                <p className="mt-1 flex flex-wrap gap-1">
                  {a.enabledCapabilities.map((c) => (
                    <span key={c} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{CAP_LABEL(c)}</span>
                  ))}
                </p>
                {a.suspensionReason && <p className="mt-1 text-xs text-warning">Suspended: {a.suspensionReason}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                {canManageDraft && a.id !== activeAccountId && a.status !== "DISABLED" && configStatus !== "DISABLED" && (
                  <Button size="sm" variant="outline" className="rounded-full text-xs" disabled={isBusy(`set-active-${a.id}`)}
                    onClick={() => call(`${base}/provider-account`, "PATCH", { activeProviderAccountId: a.id }, `set-active-${a.id}`)}>
                    Set active
                  </Button>
                )}
                {canManageLifecycle && a.status === "DRAFT" && (
                  <Button size="sm" className="rounded-full text-xs gap-1" disabled={isBusy(`act-${a.id}`)}
                    onClick={() => call(`/api/finance/provider-accounts/${a.id}/activate`, "POST", undefined, `act-${a.id}`)}>
                    <Power className="h-3 w-3" /> Activate
                  </Button>
                )}
                {canManageLifecycle && a.status === "ACTIVE" && (
                  <Button size="sm" variant="outline" className="rounded-full text-xs text-warning border-warning/30" disabled={isBusy(`sus-${a.id}`)}
                    onClick={() => {
                      const reason = window.prompt("Reason for suspending this provider account?")
                      if (reason && reason.trim().length >= 3) call(`/api/finance/provider-accounts/${a.id}/suspend`, "POST", { reason: reason.trim() }, `sus-${a.id}`)
                    }}>
                    Suspend
                  </Button>
                )}
                {canManageLifecycle && a.status !== "DISABLED" && (
                  <Button size="sm" variant="outline" className="rounded-full text-xs text-destructive border-destructive/30" disabled={isBusy(`dis-${a.id}`)}
                    onClick={() => {
                      if (window.confirm("Disable this provider account permanently? It can't be reactivated."))
                        call(`/api/finance/provider-accounts/${a.id}/disable`, "POST", undefined, `dis-${a.id}`)
                    }}>
                    Disable
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
