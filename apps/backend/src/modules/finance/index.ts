/**
 * Finance module — the single owner of DailyBread's financial domain and
 * the ONLY module that will ever talk to a payment provider.
 *
 * Actor modules (admin / vendor / customer) consume finance services;
 * they never call a provider SDK directly.
 *
 * Phase 1A (shipped): platform financial-configuration FOUNDATION —
 *   - lib/money.ts        Money convention (integer minor units + currency)
 *   - lib/currency.ts     currency-code convention helpers
 *   - lib/scope.ts        finance authz guards over the existing AdminScopeContext
 *   - providers/*         capability-segregated provider CONTRACTS (no impl yet)
 *   - secrets/*           ProviderSecretsResolver abstraction (env-backed impl)
 *   - services/*          Currency reference + PaymentProvider catalog
 *   - routes/admin.routes admin API (/admin/v1/finance/{providers,currencies})
 *
 * Not yet: CountryFinancialConfig, CountryProviderAccount, vendor payout
 * account admin/onboarding, earnings, settlement, payouts, ledger,
 * reconciliation, customer collections, Flutterwave/Stripe adapters.
 */

export { default as financeAdminRouter } from "./routes/admin.routes"

export * as Money from "./lib/money"
export { providerSecretsResolver } from "./secrets/provider-secrets.resolver"
export { getProviderAdapter, registerProviderAdapter, assertAdapterCapability } from "./providers/provider.registry"
export type { PaymentProviderAdapter } from "./providers/provider.types"

/*
 * Financial readiness — the ONE readiness system. Consumed by
 * admin.country.service.ts (country launch checklist + activation gate)
 * and, in later phases, by vendor payout onboarding and customer checkout.
 */
export {
  getFinancialReadiness,
  isCollectionReady,
  isPayoutReady,
  isBankVerificationReady,
  isFinanciallyReady,
  computeFinancialReadiness,
  describeFinancialReadinessReasons,
  FINANCIAL_READINESS_REASON_LABELS,
} from "./services/finance.readiness.service"
