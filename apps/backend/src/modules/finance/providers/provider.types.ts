/*
 * Payment-provider abstraction — CONTRACTS ONLY (Phase 1A).
 *
 * No implementation exists yet. Flutterwave / Stripe adapters come in a
 * later phase. The point of this file is that every future part of the
 * finance domain (payments, payouts, refunds, webhooks, bank resolution)
 * depends on THESE interfaces and THESE normalized types — never on a
 * provider's raw SDK/response shape.
 *
 * Capability-segregated: an adapter implements only the sub-interfaces it
 * supports. Nothing forces a card-only PSP to stub a mobile-money payout.
 */

import type { Money } from "../lib/money"
import type { ProviderCapability } from "./provider.capabilities"

//* Normalized boundary types 
//* The finance domain only ever sees these — never a Flutterwave/Stripe payload.

export type NormalizedTransactionStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"

export type NormalizedPayoutStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "REVERSED"

export type NormalizedRefundStatus = "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED"

export interface NormalizedTransaction {
  /** The provider's own id for this charge. */
  providerRef: string
  status: NormalizedTransactionStatus
  amount: Money
  /** Provider-reported fee, if any. */
  fee?: Money
  /** Free-form provider status detail, for audit/troubleshooting. */
  providerMessage?: string
  /** The untouched provider payload, retained for reconciliation/audit. */
  raw: unknown
}

export interface NormalizedPayout {
  providerRef: string
  status: NormalizedPayoutStatus
  amount: Money
  fee?: Money
  providerMessage?: string
  raw: unknown
}

export interface NormalizedRefund {
  providerRef: string
  status: NormalizedRefundStatus
  amount: Money
  providerMessage?: string
  raw: unknown
}

export interface NormalizedBankAccount {
  accountNumber: string
  accountName: string
  bankCode: string
  bankName?: string
  raw: unknown
}

export type NormalizedWebhookEventType =
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "PAYOUT_PAID"
  | "PAYOUT_FAILED"
  | "REFUND_SUCCEEDED"
  | "UNKNOWN"

export interface NormalizedWebhookEvent {
  type: NormalizedWebhookEventType
  /** Provider id of the affected transaction/payout/refund, when resolvable. */
  providerRef: string | null
  /** Provider's event id — used for internal idempotency. */
  providerEventId: string | null
  raw: unknown
}

//* Capability interfaces

export interface CreateChargeInput {
  amount: Money
  /** Internal reference the provider should echo back (idempotency + correlation). */
  reference: string
  customerEmail?: string
  customerName?: string
  metadata?: Record<string, string>
}

export interface PaymentCollectionCapability {
  createCharge(input: CreateChargeInput): Promise<NormalizedTransaction>
  verifyCharge(providerRef: string): Promise<NormalizedTransaction>
  getTransaction(providerRef: string): Promise<NormalizedTransaction>
}

export interface RefundInput {
  providerRef: string
  amount: Money
  reason?: string
}

export interface RefundCapability {
  refund(input: RefundInput): Promise<NormalizedRefund>
  getRefund(providerRef: string): Promise<NormalizedRefund>
}

export interface CreatePayoutInput {
  amount: Money
  reference: string
  destination: {
    bankCode: string
    accountNumber: string
    accountName: string
  }
  narration?: string
}

export interface PayoutCapability {
  createPayout(input: CreatePayoutInput): Promise<NormalizedPayout>
  verifyPayout(providerRef: string): Promise<NormalizedPayout>
  getPayout(providerRef: string): Promise<NormalizedPayout>
}

export interface ResolveBankAccountInput {
  bankCode: string
  accountNumber: string
}

export interface BankAccountResolutionCapability {
  resolveBankAccount(input: ResolveBankAccountInput): Promise<NormalizedBankAccount>
}

export interface WebhookCapability {
  /** Verify the provider's signature over the raw request. */
  verifySignature(rawBody: string, headers: Record<string, string | undefined>, signingSecret: string): boolean
  parseEvent(rawBody: string): NormalizedWebhookEvent
}

//* ─── Adapter ────────────────────────────────────────────────────────────

/**
 * A concrete provider implementation. Declares its capability set, and
 * exposes ONLY the sub-interfaces it actually supports (the rest are
 * undefined). Stateless — the finance service passes resolved config +
 * secrets per call; the adapter never reads env or the DB.
 */
export interface PaymentProviderAdapter {
  readonly code: string
  readonly capabilities: ReadonlySet<ProviderCapability>

  collection?: PaymentCollectionCapability
  refunds?: RefundCapability
  payouts?: PayoutCapability
  bankResolution?: BankAccountResolutionCapability
  webhooks?: WebhookCapability
}
