import { describe, it, expect, beforeEach } from "vitest"
import {
  registerProviderAdapter,
  getProviderAdapter,
  hasProviderAdapter,
  assertAdapterCapability,
  _resetProviderRegistry,
} from "./provider.registry"
import { createFlutterwaveAdapter } from "./flutterwave"
import { ApiError } from "@/errors/ApiError"

describe("provider registry", () => {
  beforeEach(() => _resetProviderRegistry())

  it("resolves FLUTTERWAVE to the Flutterwave adapter once registered", () => {
    registerProviderAdapter(createFlutterwaveAdapter())
    expect(hasProviderAdapter("FLUTTERWAVE")).toBe(true)
    expect(hasProviderAdapter("flutterwave")).toBe(true) // case-insensitive
    const adapter = getProviderAdapter("FLUTTERWAVE")
    expect(adapter.code).toBe("FLUTTERWAVE")
    expect(adapter.collection).toBeDefined()
    expect(adapter.payouts).toBeDefined()
    expect(adapter.refunds).toBeDefined()
    expect(adapter.webhooks).toBeDefined()
  })

  it("throws 501 PROVIDER_ADAPTER_NOT_IMPLEMENTED for an unregistered provider", () => {
    try {
      getProviderAdapter("STRIPE")
      expect.unreachable("should have thrown")
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).statusCode).toBe(501)
      expect((e as ApiError).code).toBe("PROVIDER_ADAPTER_NOT_IMPLEMENTED")
    }
    expect(hasProviderAdapter("STRIPE")).toBe(false)
  })

  it("assertAdapterCapability passes for a supported capability and 422s for an unsupported one", () => {
    registerProviderAdapter(createFlutterwaveAdapter())
    expect(() => assertAdapterCapability("FLUTTERWAVE", "COLLECTION_MOBILE_MONEY")).not.toThrow()
    try {
      assertAdapterCapability("FLUTTERWAVE", "PAYOUT_MOBILE_MONEY") // FW adapter Phase 1C: bank payout only
      expect.unreachable("should have thrown")
    } catch (e) {
      expect((e as ApiError).statusCode).toBe(422)
    }
  })
})
