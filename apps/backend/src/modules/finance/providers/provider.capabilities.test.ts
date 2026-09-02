import { describe, it, expect } from "vitest"
import {
  validateProviderCapabilityCoherence,
  isProviderCapability,
  PROVIDER_CAPABILITIES,
  enabledCapabilitiesNotSupported,
  collectionCapabilityForMethodType,
  payoutCapabilityForMethodType,
} from "./provider.capabilities"
import { PAYMENT_PROVIDERS } from "../../../../../../packages/database/src/seed/finance/data/payment-providers.data"

describe("provider capability vocabulary", () => {
  it("recognises exactly the declared capability tokens", () => {
    for (const c of PROVIDER_CAPABILITIES) expect(isProviderCapability(c)).toBe(true)
    expect(isProviderCapability("COLLECTION_CRYPTO")).toBe(false)
    expect(isProviderCapability("")).toBe(false)
  })
})

describe("validateProviderCapabilityCoherence", () => {
  it("passes a coherent card + bank provider", () => {
    expect(
      validateProviderCapabilityCoherence({
        capabilities: ["COLLECTION_CARD", "REFUND", "PAYOUT_BANK", "WEBHOOKS"],
        methodTypes: ["CARD", "BANK"],
        supportedCurrencies: ["USD", "EUR"],
      }),
    ).toEqual([])
  })

  it("requires at least one capability", () => {
    expect(validateProviderCapabilityCoherence({ capabilities: [] })).toContain(
      "A provider must declare at least one capability",
    )
  })

  it("rejects a declared method type with no supporting capability", () => {
    const problems = validateProviderCapabilityCoherence({
      capabilities: ["COLLECTION_CARD"],
      methodTypes: ["MOBILE_MONEY"],
    })
    expect(problems.some((p) => p.includes("MOBILE_MONEY"))).toBe(true)
  })

  it("rejects unknown capability / method-type tokens", () => {
    expect(
      validateProviderCapabilityCoherence({ capabilities: ["NOT_A_CAP"], methodTypes: ["CARD"] }),
    ).toEqual(expect.arrayContaining([expect.stringContaining("Unknown capability")]))
    expect(
      validateProviderCapabilityCoherence({ capabilities: ["COLLECTION_CARD"], methodTypes: ["CRYPTO"] }),
    ).toEqual(expect.arrayContaining([expect.stringContaining("Unknown method type")]))
  })

  it("rejects duplicates and malformed currency codes", () => {
    expect(
      validateProviderCapabilityCoherence({ capabilities: ["REFUND", "REFUND"] }),
    ).toContain("Duplicate capability values")
    expect(
      validateProviderCapabilityCoherence({ capabilities: ["REFUND"], supportedCurrencies: ["US$", "kes"] }),
    ).toEqual(expect.arrayContaining([expect.stringContaining("Malformed currency code")]))
  })
})

describe("country-enabled vs provider capability (Phase 1B)", () => {
  it("enabledCapabilitiesNotSupported flags anything the provider does not declare", () => {
    expect(enabledCapabilitiesNotSupported(["PAYOUT_BANK"], ["PAYOUT_BANK", "REFUND"])).toEqual([])
    expect(enabledCapabilitiesNotSupported(["PAYOUT_MOBILE_MONEY"], ["PAYOUT_BANK"])).toEqual(["PAYOUT_MOBILE_MONEY"])
    expect(enabledCapabilitiesNotSupported([], ["PAYOUT_BANK"])).toEqual([])
  })

  it("maps a method type to the capability that services it", () => {
    expect(collectionCapabilityForMethodType("CARD")).toBe("COLLECTION_CARD")
    expect(collectionCapabilityForMethodType("MOBILE_MONEY")).toBe("COLLECTION_MOBILE_MONEY")
    expect(collectionCapabilityForMethodType("BANK")).toBe("COLLECTION_BANK_TRANSFER")
    expect(payoutCapabilityForMethodType("BANK")).toBe("PAYOUT_BANK")
    expect(payoutCapabilityForMethodType("MOBILE_MONEY")).toBe("PAYOUT_MOBILE_MONEY")
    expect(payoutCapabilityForMethodType("CARD")).toBeNull() // no card payout
  })
})

describe("seeded payment-provider catalog", () => {
  it("every seeded provider is internally coherent", () => {
    for (const p of PAYMENT_PROVIDERS) {
      const problems = validateProviderCapabilityCoherence({
        capabilities: p.capabilities,
        methodTypes: p.methodTypes,
        supportedCurrencies: p.supportedCurrencies,
      })
      expect(problems, `${p.code}: ${problems.join("; ")}`).toEqual([])
    }
  })

  it("provider codes are unique", () => {
    const codes = PAYMENT_PROVIDERS.map((p) => p.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})
