/*
 * Provider failures, normalized. Every adapter converts whatever its
 * provider throws (an HTTP status, a network error, a timeout, a provider
 * error body) into a ProviderError with one of these categories. The
 * finance domain — and any customer-facing surface above it — reasons about
 * the category, never a raw provider HTTP status or message.
 *
 * `providerMessage` keeps a SAFE, non-secret snippet of provider detail for
 * logs/audit/support. It is never surfaced to a customer and never contains
 * credentials (adapters must not put a token/secret/header into it).
 */

import { ApiError } from "@/errors/ApiError"

export type ProviderErrorCategory =
  | "AUTHENTICATION" //* our credentials/token were rejected — a config problem
  | "PROVIDER_UNAVAILABLE" //* network failure / 5xx / DNS — provider side, retryable
  | "INVALID_REQUEST" //* provider rejected the request shape — our bug building it
  | "UNSUPPORTED_CAPABILITY" //* asked for something this provider/account can't do
  | "TRANSACTION_DECLINED" //* the payment/transfer itself failed (not the API call)
  | "TIMEOUT" //* the call exceeded our deadline
  | "RATE_LIMIT" //* provider throttled us
  | "UNKNOWN"

export interface ProviderErrorContext {
  httpStatus?: number
  providerRef?: string
  /** Safe, non-secret provider detail. */
  providerMessage?: string
  /** Correlation id we sent / the provider returned. */
  traceId?: string
}

export class ProviderError extends Error {
  readonly name = "ProviderError"

  constructor(
    readonly category: ProviderErrorCategory,
    message: string,
    readonly providerCode: string,
    readonly context: ProviderErrorContext = {},
  ) {
    super(message)
    Object.setPrototypeOf(this, ProviderError.prototype)
  }

  /** Retryable at the transport level (not "retry a declined card"). */
  get retryable(): boolean {
    return (
      this.category === "PROVIDER_UNAVAILABLE" ||
      this.category === "TIMEOUT" ||
      this.category === "RATE_LIMIT"
    )
  }

  /**
   * Convert to the app's HTTP error so the global error middleware handles
   * it. Deliberately vague to callers — a provider failure never leaks the
   * provider's own words or status to a client; the detail stays in logs.
   */
  toApiError(): ApiError {
    switch (this.category) {
      case "AUTHENTICATION":
        return new ApiError(502, "Payment provider configuration error", "PROVIDER_AUTH_FAILED")
      case "PROVIDER_UNAVAILABLE":
        return new ApiError(503, "Payment provider is temporarily unavailable", "PROVIDER_UNAVAILABLE")
      case "TIMEOUT":
        return new ApiError(504, "Payment provider timed out", "PROVIDER_TIMEOUT")
      case "RATE_LIMIT":
        return new ApiError(503, "Payment provider is rate limiting requests", "PROVIDER_RATE_LIMITED")
      case "INVALID_REQUEST":
        return new ApiError(502, "Payment provider rejected the request", "PROVIDER_INVALID_REQUEST")
      case "UNSUPPORTED_CAPABILITY":
        return new ApiError(422, "This operation is not supported by the configured provider", "PROVIDER_CAPABILITY_UNSUPPORTED")
      case "TRANSACTION_DECLINED":
        return new ApiError(402, "The payment was declined by the provider", "PROVIDER_TRANSACTION_DECLINED")
      default:
        return new ApiError(502, "Payment provider error", "PROVIDER_ERROR")
    }
  }
}

/** Map an HTTP status from any provider to a category (adapters may override per body). */
export function categoryForHttpStatus(status: number): ProviderErrorCategory {
  if (status === 401 || status === 403) return "AUTHENTICATION"
  if (status === 408) return "TIMEOUT"
  if (status === 429) return "RATE_LIMIT"
  if (status >= 500) return "PROVIDER_UNAVAILABLE"
  if (status === 400 || status === 404 || status === 422) return "INVALID_REQUEST"
  return "UNKNOWN"
}

export function isProviderError(e: unknown): e is ProviderError {
  return e instanceof ProviderError
}
