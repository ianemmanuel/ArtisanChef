/*
 * Pure Flutterwave → DailyBread normalization. No Flutterwave status string
 * ever leaves this file into domain code — everything above the adapter
 * speaks only the Normalized* unions.
 */

import type {
  NormalizedTransactionStatus,
  NormalizedPayoutStatus,
  NormalizedRefundStatus,
  NormalizedWebhookEventType,
} from "../provider.types"

function norm(s: unknown): string {
  return String(s ?? "").trim().toLowerCase()
}

export function mapChargeStatus(raw: unknown): NormalizedTransactionStatus {
  switch (norm(raw)) {
    case "succeeded":
    case "successful":
    case "success":
    case "completed":
      return "SUCCEEDED"
    case "processing":
    case "pending_authorization":
    case "authorization_required":
      return "PROCESSING"
    case "pending":
    case "new":
    case "initiated":
      return "PENDING"
    case "failed":
    case "declined":
    case "error":
      return "FAILED"
    case "cancelled":
    case "canceled":
    case "voided":
      return "CANCELLED"
    case "abandoned":
    case "expired":
    case "timeout":
      return "EXPIRED"
    default:
      return "PENDING"
  }
}

export function mapPayoutStatus(raw: unknown): NormalizedPayoutStatus {
  // Flutterwave v4 transfer statuses: NEW PENDING FAILED SUCCESSFUL CANCELLED INITIATED
  switch (norm(raw)) {
    case "successful":
    case "succeeded":
    case "success":
    case "completed":
      return "PAID"
    case "processing":
      return "PROCESSING"
    case "new":
    case "pending":
    case "initiated":
    case "queued":
      return "PENDING"
    case "failed":
    case "error":
    case "cancelled":
    case "canceled":
      return "FAILED"
    case "reversed":
    case "refunded":
      return "REVERSED"
    default:
      return "PENDING"
  }
}

export function mapRefundStatus(raw: unknown): NormalizedRefundStatus {
  // Flutterwave v4 refund statuses: pending requires_action succeeded failed
  // cancelled completed new
  switch (norm(raw)) {
    case "completed":
    case "succeeded":
    case "successful":
    case "success":
      return "SUCCEEDED"
    case "processing":
    case "requires_action":
      return "PROCESSING"
    case "pending":
    case "new":
    case "initiated":
      return "PENDING"
    case "failed":
    case "error":
    case "cancelled":
    case "canceled":
      return "FAILED"
    default:
      return "PENDING"
  }
}

/**
 * Map a Flutterwave webhook `type` + inner `data.status` to a normalized
 * event type. `charge.completed` can carry a FAILED status, so the inner
 * status is always consulted, never assumed from the event name.
 */
export function mapWebhookEventType(eventType: unknown, dataStatus: unknown): NormalizedWebhookEventType {
  const t = norm(eventType)
  if (t.startsWith("charge")) {
    return mapChargeStatus(dataStatus) === "SUCCEEDED" ? "PAYMENT_SUCCEEDED" : "PAYMENT_FAILED"
  }
  if (t.startsWith("transfer") || t.startsWith("payout")) {
    return mapPayoutStatus(dataStatus) === "PAID" ? "PAYOUT_PAID" : "PAYOUT_FAILED"
  }
  if (t.startsWith("refund")) {
    return mapRefundStatus(dataStatus) === "SUCCEEDED" ? "REFUND_SUCCEEDED" : "REFUND_FAILED"
  }
  return "UNKNOWN"
}
