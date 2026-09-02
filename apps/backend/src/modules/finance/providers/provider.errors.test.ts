import { describe, it, expect } from "vitest"
import { ProviderError, categoryForHttpStatus, isProviderError } from "./provider.errors"
import { ApiError } from "@/errors/ApiError"

describe("categoryForHttpStatus", () => {
  it.each([
    [401, "AUTHENTICATION"],
    [403, "AUTHENTICATION"],
    [408, "TIMEOUT"],
    [429, "RATE_LIMIT"],
    [500, "PROVIDER_UNAVAILABLE"],
    [503, "PROVIDER_UNAVAILABLE"],
    [400, "INVALID_REQUEST"],
    [422, "INVALID_REQUEST"],
    [418, "UNKNOWN"],
  ])("maps %i -> %s", (status, expected) => {
    expect(categoryForHttpStatus(status)).toBe(expected)
  })
})

describe("ProviderError", () => {
  it("marks transport failures retryable, declines not", () => {
    expect(new ProviderError("PROVIDER_UNAVAILABLE", "x", "FLUTTERWAVE").retryable).toBe(true)
    expect(new ProviderError("TIMEOUT", "x", "FLUTTERWAVE").retryable).toBe(true)
    expect(new ProviderError("RATE_LIMIT", "x", "FLUTTERWAVE").retryable).toBe(true)
    expect(new ProviderError("TRANSACTION_DECLINED", "x", "FLUTTERWAVE").retryable).toBe(false)
    expect(new ProviderError("AUTHENTICATION", "x", "FLUTTERWAVE").retryable).toBe(false)
  })

  it("toApiError maps each category to a safe HTTP error that never leaks provider wording", () => {
    const cases: Array<[Parameters<typeof toErr>[0], number, string]> = [
      ["AUTHENTICATION", 502, "PROVIDER_AUTH_FAILED"],
      ["PROVIDER_UNAVAILABLE", 503, "PROVIDER_UNAVAILABLE"],
      ["TIMEOUT", 504, "PROVIDER_TIMEOUT"],
      ["RATE_LIMIT", 503, "PROVIDER_RATE_LIMITED"],
      ["INVALID_REQUEST", 502, "PROVIDER_INVALID_REQUEST"],
      ["UNSUPPORTED_CAPABILITY", 422, "PROVIDER_CAPABILITY_UNSUPPORTED"],
      ["TRANSACTION_DECLINED", 402, "PROVIDER_TRANSACTION_DECLINED"],
      ["UNKNOWN", 502, "PROVIDER_ERROR"],
    ]
    function toErr(cat: ProviderError["category"]) {
      return new ProviderError(cat, "raw provider message with secrets-ish text", "FLUTTERWAVE", {
        providerMessage: "sensitive detail",
      }).toApiError()
    }
    for (const [cat, status, code] of cases) {
      const api = toErr(cat)
      expect(api).toBeInstanceOf(ApiError)
      expect(api.statusCode).toBe(status)
      expect(api.code).toBe(code)
      expect(api.message).not.toContain("sensitive detail")
      expect(api.message).not.toContain("secrets-ish")
    }
  })

  it("isProviderError narrows correctly", () => {
    expect(isProviderError(new ProviderError("UNKNOWN", "x", "FLUTTERWAVE"))).toBe(true)
    expect(isProviderError(new Error("x"))).toBe(false)
  })
})
