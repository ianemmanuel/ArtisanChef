/*
 * Finance domain contracts — Phase 1A (platform financial configuration
 * foundation). See apps/backend/src/modules/finance.
 *
 * Only reference-data shapes so far: Currency + PaymentProvider catalog.
 * CountryFinancialConfig / CountryProviderAccount / payments / payouts /
 * ledger are later phases and deliberately absent.
 */

import type {
  FinanceReferenceStatus,
  PaymentProviderCapability,
  PaymentEnvironment,
  CountryFinancialConfigStatus,
  CountryProviderAccountStatus,
  FinancialReadinessReason,
  ProviderWebhookEventStatus,
  NormalizedWebhookEventType,
} from "../enums/finance"

//* ─── Money ──────────────────────────────────────────────────────────────
//* The canonical representation of a monetary amount everywhere in the
//* finance domain: an integer number of a currency's minor unit, plus the
//* currency it is denominated in. Never a float, never currency-less.
export interface Money {
  /** Integer count of the currency's minor unit (e.g. 10000 = KES 100.00). */
  amountMinor: number
  /** ISO-4217 code, uppercase — must resolve to a Currency row. */
  currency: string
}

//* ─── Currency reference ─────────────────────────────────────────────────

export interface Currency {
  code: string
  name: string
  symbol: string | null
  minorUnitDigits: number
  status: FinanceReferenceStatus
  createdByAdminId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateCurrencyRequest {
  code: string
  name: string
  symbol?: string
  minorUnitDigits?: number
}

export interface UpdateCurrencyRequest {
  name?: string
  symbol?: string
  minorUnitDigits?: number
}

//* ─── PaymentProvider catalog ────────────────────────────────────────────

export interface PaymentProvider {
  id: string
  code: string
  name: string
  status: FinanceReferenceStatus
  capabilities: PaymentProviderCapability[]
  methodTypes: string[]
  supportedCurrencies: string[]
  description: string | null
  createdByAdminId: string | null
  createdAt: string
  updatedAt: string
}

export interface PaymentProviderListResult {
  providers: PaymentProvider[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CreatePaymentProviderRequest {
  code: string
  name: string
  capabilities: PaymentProviderCapability[]
  methodTypes?: string[]
  supportedCurrencies?: string[]
  description?: string
}

export interface UpdatePaymentProviderRequest {
  name?: string
  capabilities?: PaymentProviderCapability[]
  methodTypes?: string[]
  supportedCurrencies?: string[]
  description?: string
}

export interface SetFinanceReferenceStatusRequest {
  status: FinanceReferenceStatus
}

//* ─── Phase 1B — country provider account ────────────────────────────────

export interface CountryProviderAccount {
  id: string
  countryId: string
  paymentProviderId: string
  environment: PaymentEnvironment
  /** Non-secret reference; the secret bundle itself is never returned. */
  secretAlias: string
  enabledCapabilities: PaymentProviderCapability[]
  accountLabel: string | null
  externalAccountId: string | null
  status: CountryProviderAccountStatus
  activatedAt: string | null
  suspendedAt: string | null
  suspensionReason: string | null
  disabledAt: string | null
  createdByAdminId: string | null
  createdAt: string
  updatedAt: string
  /** Present when the endpoint joins it. */
  paymentProvider?: {
    id: string
    code: string
    name: string
    status: FinanceReferenceStatus
    capabilities: PaymentProviderCapability[]
  }
}

export interface CreateCountryProviderAccountRequest {
  paymentProviderId: string
  environment: PaymentEnvironment
  secretAlias: string
  enabledCapabilities: PaymentProviderCapability[]
  accountLabel?: string
  externalAccountId?: string
}

export interface UpdateCountryProviderAccountRequest {
  enabledCapabilities?: PaymentProviderCapability[]
  accountLabel?: string
  externalAccountId?: string
  /** Structural — global-scope only. */
  secretAlias?: string
  environment?: PaymentEnvironment
}

export interface SuspendRequest {
  reason: string
}

//* ─── Phase 1B — country financial config ───────────────────────────────

export interface CountryFinancialConfig {
  id: string
  countryId: string
  currencyCode: string | null
  activeProviderAccountId: string | null
  collectionsEnabled: boolean
  payoutsEnabled: boolean
  status: CountryFinancialConfigStatus
  activatedAt: string | null
  suspendedAt: string | null
  suspensionReason: string | null
  disabledAt: string | null
  createdByAdminId: string | null
  createdAt: string
  updatedAt: string
  currency?: Currency | null
  activeProviderAccount?: CountryProviderAccount | null
}

export interface UpdateCountryFinancialConfigStructuralRequest {
  /** Structural change — controlled action, global-scope for an ACTIVE config. */
  currencyCode?: string
  activeProviderAccountId?: string | null
}

export interface SetOperationalSwitchesRequest {
  collectionsEnabled?: boolean
  payoutsEnabled?: boolean
}

//* ─── Phase 1B — readiness ──────────────────────────────────────────────

export interface ReadinessCheck {
  ready: boolean
  reasons: FinancialReadinessReason[]
}

export interface FinancialReadiness {
  countryId: string
  collection: ReadinessCheck
  payout: ReadinessCheck
  bankVerification: ReadinessCheck
  financiallyReady: boolean
  /** Deduped union of every failing reason — for country-activation display. */
  reasons: FinancialReadinessReason[]
}

export interface CountryFinancialConfigView {
  config: CountryFinancialConfig | null
  providerAccounts: CountryProviderAccount[]
  readiness: FinancialReadiness
  /** Phase 1C — can this country actually reach its provider (no network check). */
  providerGateway: ProviderGatewayStatus
  /** Phase 1C — payment methods and which provider account (if any) executes each. */
  paymentMethods: CountryPaymentMethodWithProvider[]
  /** What the current admin may do, given permission + scope. */
  canManageDraft: boolean
  canManageLifecycle: boolean
}

//* ─── Phase 1C — provider wiring ────────────────────────────────────────

export interface ProviderGatewayStatus {
  configured: boolean
  providerCode: string | null
  environment: PaymentEnvironment | null
  /** A concrete adapter is registered for the provider code. */
  adapterRegistered: boolean
  /** The account's secret alias resolves to a credential bundle. */
  credentialsResolvable: boolean
  enabledCapabilities: string[]
  blockers: string[]
}

export interface CountryPaymentMethodWithProvider {
  id: string
  countryId: string
  direction: "INBOUND" | "OUTBOUND"
  status: string
  countryProviderAccountId: string | null
  displayOrder: number
  paymentMethod: {
    id: string
    code: string
    name: string
    type: string
  }
  countryProviderAccount: {
    id: string
    status: CountryProviderAccountStatus
    environment: PaymentEnvironment
    accountLabel: string | null
    enabledCapabilities: PaymentProviderCapability[]
    paymentProvider: { code: string; name: string; status: FinanceReferenceStatus }
  } | null
}

export interface SetPaymentMethodProviderAccountRequest {
  countryProviderAccountId: string | null
}

//* ─── Phase 1C — recorded provider webhook event ────────────────────────

export interface ProviderWebhookEvent {
  id: string
  provider: string
  providerEventId: string
  eventType: NormalizedWebhookEventType | string
  providerRef: string | null
  countryProviderAccountId: string | null
  status: ProviderWebhookEventStatus
  receivedAt: string
  processedAt: string | null
}
