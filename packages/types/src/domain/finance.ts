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
  /** What the current admin may do, given permission + scope. */
  canManageDraft: boolean
  canManageLifecycle: boolean
}
