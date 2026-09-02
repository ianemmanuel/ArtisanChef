/*
 * Finance Phase 1A enums — hand-mirrored from the Prisma schema
 * (packages/database/prisma/schema.prisma). Kept in sync by hand, same
 * convention this repo already uses for e.g. PayoutVerificationStatus in
 * domain/vendor.ts — the Prisma-generated enum is server-only, this is the
 * shared contract frontend + backend agree on.
 */

export enum FinanceReferenceStatus {
  ACTIVE   = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export enum PaymentProviderCapability {
  COLLECTION_CARD          = "COLLECTION_CARD",
  COLLECTION_MOBILE_MONEY  = "COLLECTION_MOBILE_MONEY",
  COLLECTION_BANK_TRANSFER = "COLLECTION_BANK_TRANSFER",
  REFUND                   = "REFUND",
  BANK_ACCOUNT_RESOLUTION  = "BANK_ACCOUNT_RESOLUTION",
  PAYOUT_BANK              = "PAYOUT_BANK",
  PAYOUT_MOBILE_MONEY      = "PAYOUT_MOBILE_MONEY",
  WEBHOOKS                 = "WEBHOOKS",
}

/** Every capability value, for iteration / validation. */
export const PAYMENT_PROVIDER_CAPABILITIES: PaymentProviderCapability[] =
  Object.values(PaymentProviderCapability)

//* ─── Phase 1B ───────────────────────────────────────────────────────────

export enum PaymentEnvironment {
  TEST = "TEST",
  LIVE = "LIVE",
}

export enum CountryFinancialConfigStatus {
  DRAFT     = "DRAFT",
  ACTIVE    = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DISABLED  = "DISABLED",
}

export enum CountryProviderAccountStatus {
  DRAFT     = "DRAFT",
  ACTIVE    = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DISABLED  = "DISABLED",
}

//* ─── Phase 1C ───────────────────────────────────────────────────────────

export enum ProviderWebhookEventStatus {
  RECEIVED  = "RECEIVED",
  PROCESSED = "PROCESSED",
  SKIPPED   = "SKIPPED",
}

/** Normalized (provider-independent) webhook event type. */
export type NormalizedWebhookEventType =
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "PAYOUT_PAID"
  | "PAYOUT_FAILED"
  | "REFUND_SUCCEEDED"
  | "REFUND_FAILED"
  | "UNKNOWN"

//* Deterministic, admin-displayable reasons a country's financial readiness
//* check can fail. Consumed by the Admin ERP and by country activation.
export type FinancialReadinessReason =
  | "FINANCIAL_CONFIG_MISSING"
  | "FINANCIAL_CONFIG_NOT_ACTIVE"
  | "CURRENCY_NOT_CONFIGURED"
  | "CURRENCY_INACTIVE"
  | "PROVIDER_ACCOUNT_NOT_CONFIGURED"
  | "PROVIDER_ACCOUNT_NOT_ACTIVE"
  | "PROVIDER_INACTIVE"
  | "PROVIDER_ENVIRONMENT_MISMATCH"
  | "COLLECTIONS_DISABLED"
  | "NO_COLLECTION_CAPABILITY"
  | "NO_VALID_INBOUND_PAYMENT_METHOD"
  | "PAYOUTS_DISABLED"
  | "NO_PAYOUT_CAPABILITY"
  | "NO_VALID_OUTBOUND_PAYOUT_METHOD"
  | "NO_BANK_VERIFICATION_CAPABILITY"
  //* Phase 1C — the explicit provider-account <-> payment-method wiring and
  //* the concrete provider adapter.
  | "PROVIDER_ADAPTER_UNAVAILABLE"
  | "PROVIDER_CREDENTIALS_UNRESOLVED"
  | "NO_INBOUND_METHOD_WIRED_TO_PROVIDER"
  | "NO_OUTBOUND_METHOD_WIRED_TO_PROVIDER"

/** Shared, deterministic display phrasing for each readiness reason. */
export const FINANCIAL_READINESS_REASON_LABELS: Record<FinancialReadinessReason, string> = {
  FINANCIAL_CONFIG_MISSING: "financial configuration not created",
  FINANCIAL_CONFIG_NOT_ACTIVE: "financial configuration not activated",
  CURRENCY_NOT_CONFIGURED: "currency not configured",
  CURRENCY_INACTIVE: "configured currency is inactive",
  PROVIDER_ACCOUNT_NOT_CONFIGURED: "no active payment-provider account",
  PROVIDER_ACCOUNT_NOT_ACTIVE: "payment-provider account not activated",
  PROVIDER_INACTIVE: "payment provider is inactive",
  PROVIDER_ENVIRONMENT_MISMATCH: "provider account environment does not match this deployment",
  COLLECTIONS_DISABLED: "customer collections disabled",
  NO_COLLECTION_CAPABILITY: "no collection capability enabled",
  NO_VALID_INBOUND_PAYMENT_METHOD: "no usable customer payment method",
  PAYOUTS_DISABLED: "vendor payouts disabled",
  NO_PAYOUT_CAPABILITY: "no payout capability enabled",
  NO_VALID_OUTBOUND_PAYOUT_METHOD: "no usable vendor payout method",
  NO_BANK_VERIFICATION_CAPABILITY: "bank-account verification not available",
  PROVIDER_ADAPTER_UNAVAILABLE: "no integration is available for the configured provider",
  PROVIDER_CREDENTIALS_UNRESOLVED: "payment-provider credentials are not configured",
  NO_INBOUND_METHOD_WIRED_TO_PROVIDER: "no customer payment method is wired to the provider account",
  NO_OUTBOUND_METHOD_WIRED_TO_PROVIDER: "no vendor payout method is wired to the provider account",
}
