import { describe, it, expect } from "vitest"
import {
  validateProviderCapabilityCoherence,
  isProviderCapability,
  PROVIDER_CAPABILITIES,
  INTEGRATION_CAPABILITIES,
  BUSINESS_CAPABILITIES,
  autoEnabledIntegrationCapabilities,
  resolveEnabledCapabilities,
  enabledCapabilitiesNotSupported,
  collectionCapabilityForMethodType,
  payoutCapabilityForMethodType,
  isOutboundMethodPayable,
  providerRouteClassFor,
  isIntegrationCapability,
  isBusinessCapability,
} from "./provider.capabilities"
import { deriveProviderSecretAlias } from "../secrets/provider-secrets.resolver"
import { PAYMENT_PROVIDERS } from "../../../../../../packages/database/src/seed/finance/data/payment-providers.data"

describe("provider capability vocabulary", () => {
  it("recognises exactly the declared capability tokens", () => {
    for (const c of PROVIDER_CAPABILITIES) expect(isProviderCapability(c)).toBe(true)
    expect(isProviderCapability("COLLECTION_CRYPTO")).toBe(false)
    expect(isProviderCapability("")).toBe(false)
  })
})

describe("business vs integration capability split", () => {
  it("partitions every capability into exactly one of the two sets", () => {
    const union = new Set<string>([...BUSINESS_CAPABILITIES, ...INTEGRATION_CAPABILITIES])
    expect(union.size).toBe(PROVIDER_CAPABILITIES.length)
    for (const c of PROVIDER_CAPABILITIES) expect(union.has(c)).toBe(true)
    for (const c of BUSINESS_CAPABILITIES) expect(INTEGRATION_CAPABILITIES).not.toContain(c)
  })

  it("auto-enables only the integration capabilities the provider declares", () => {
    expect(autoEnabledIntegrationCapabilities(["COLLECTION_CARD", "WEBHOOKS", "BANK_LIST"])).toEqual([
      "WEBHOOKS",
      "BANK_LIST",
    ])
    expect(autoEnabledIntegrationCapabilities(["COLLECTION_CARD"])).toEqual([])
  })

  it("resolveEnabledCapabilities keeps admin business picks + merges integration, deduped", () => {
    const resolved = resolveEnabledCapabilities(
      // admin sent a business pick plus (defensively) an integration token
      ["COLLECTION_CARD", "BANK_LIST"],
      ["COLLECTION_CARD", "COLLECTION_MOBILE_MONEY", "WEBHOOKS", "BANK_LIST", "BANK_ACCOUNT_RESOLUTION"],
    )
    expect(resolved).toContain("COLLECTION_CARD")
    expect(resolved).toContain("WEBHOOKS")
    expect(resolved).toContain("BANK_LIST")
    expect(resolved).toContain("BANK_ACCOUNT_RESOLUTION")
    expect(resolved).not.toContain("COLLECTION_MOBILE_MONEY") // admin didn't pick it
    expect(new Set(resolved).size).toBe(resolved.length)
  })
})

describe("deriveProviderSecretAlias", () => {
  it("is a deterministic function of provider + country + environment", () => {
    expect(deriveProviderSecretAlias("FLUTTERWAVE", "KE", "TEST")).toBe("flutterwave_ke_test")
    expect(deriveProviderSecretAlias("FLUTTERWAVE", "KE", "LIVE")).toBe("flutterwave_ke_live")
    expect(deriveProviderSecretAlias("flutterwave", "ke", "TEST")).toBe("flutterwave_ke_test")
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

describe("isOutboundMethodPayable — what a vendor may be OFFERED as a payout method", () => {
  const active = (caps: string[]) => ({ status: "ACTIVE", enabledCapabilities: caps, providerStatus: "ACTIVE" })

  it("offers a method wired to an ACTIVE account that enables its payout capability", () => {
    expect(isOutboundMethodPayable({ methodType: "BANK", account: active(["PAYOUT_BANK"]) })).toBe(true)
    expect(isOutboundMethodPayable({ methodType: "MOBILE_MONEY", account: active(["PAYOUT_MOBILE_MONEY"]) })).toBe(true)
  })

  it("does NOT offer an unwired method (no provider account)", () => {
    expect(isOutboundMethodPayable({ methodType: "BANK", account: null })).toBe(false)
  })

  it("does NOT offer a method whose account is not ACTIVE, or whose provider is not ACTIVE", () => {
    expect(isOutboundMethodPayable({ methodType: "BANK", account: { status: "DRAFT", enabledCapabilities: ["PAYOUT_BANK"], providerStatus: "ACTIVE" } })).toBe(false)
    expect(isOutboundMethodPayable({ methodType: "BANK", account: { status: "SUSPENDED", enabledCapabilities: ["PAYOUT_BANK"], providerStatus: "ACTIVE" } })).toBe(false)
    expect(isOutboundMethodPayable({ methodType: "BANK", account: { status: "ACTIVE", enabledCapabilities: ["PAYOUT_BANK"], providerStatus: "INACTIVE" } })).toBe(false)
  })

  it("does NOT offer a method whose account lacks the payout capability for its type", () => {
    // account can do bank payouts, but the method is mobile money
    expect(isOutboundMethodPayable({ methodType: "MOBILE_MONEY", account: active(["PAYOUT_BANK"]) })).toBe(false)
  })

  it("does NOT offer a method type that has no payout capability at all (e.g. CARD)", () => {
    expect(isOutboundMethodPayable({ methodType: "CARD", account: active(["PAYOUT_BANK", "PAYOUT_MOBILE_MONEY"]) })).toBe(false)
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

describe("providerRouteClassFor — capability-scoped routing", () => {
  it("bank-account resolution routes through the country-global bank-verification binding", () => {
    expect(providerRouteClassFor("BANK_ACCOUNT_RESOLUTION")).toBe("BANK_VERIFICATION")
  })

  it("every method-specific business capability routes through a payment method (never the bank-verification binding)", () => {
    for (const c of ["COLLECTION_CARD", "COLLECTION_MOBILE_MONEY", "COLLECTION_BANK_TRANSFER", "PAYOUT_BANK", "PAYOUT_MOBILE_MONEY", "REFUND"] as const) {
      expect(providerRouteClassFor(c)).toBe("PAYMENT_METHOD")
    }
  })

  it("WEBHOOKS is not resolvable through the gateway", () => {
    expect(providerRouteClassFor("WEBHOOKS")).toBe("UNROUTABLE")
  })

  it("every declared capability has exactly one route class", () => {
    for (const c of PROVIDER_CAPABILITIES) {
      expect(["BANK_VERIFICATION", "PAYMENT_METHOD", "UNROUTABLE"]).toContain(providerRouteClassFor(c))
    }
  })

  it("collection and payout route classes never overlap with bank verification", () => {
    // A collection/payout capability can never accidentally resolve the
    // bank-verification provider account, and vice versa.
    const businessRouted = PROVIDER_CAPABILITIES.filter((c) => providerRouteClassFor(c) === "PAYMENT_METHOD")
    const bankVerifRouted = PROVIDER_CAPABILITIES.filter((c) => providerRouteClassFor(c) === "BANK_VERIFICATION")
    expect(businessRouted.some((c) => bankVerifRouted.includes(c))).toBe(false)
    expect(bankVerifRouted).toEqual(["BANK_ACCOUNT_RESOLUTION"])
  })
})

/*
 * BANK_LIST routes with the payout, not with verification. The bank the
 * vendor picks becomes the stored bankCode, which is later handed to the
 * provider that actually moves the money — so the directory has to come from
 * that provider. It also has to work in a MANUAL-verification country, which
 * has no bank-verification account bound at all.
 */
describe("providerRouteClassFor — BANK_LIST follows the payout, not the verifier", () => {
  it("routes BANK_LIST through a payment method, not the bank-verification binding", () => {
    expect(providerRouteClassFor("BANK_LIST")).toBe("PAYMENT_METHOD")
  })

  it("keeps BANK_ACCOUNT_RESOLUTION on the independent bank-verification binding", () => {
    expect(providerRouteClassFor("BANK_ACCOUNT_RESOLUTION")).toBe("BANK_VERIFICATION")
  })

  it("so the two bank capabilities can resolve to different providers", () => {
    expect(providerRouteClassFor("BANK_LIST")).not.toBe(providerRouteClassFor("BANK_ACCOUNT_RESOLUTION"))
  })

  it("BANK_LIST stays an integration capability (auto-enabled, never an admin checkbox)", () => {
    expect(isIntegrationCapability("BANK_LIST")).toBe(true)
    expect(isBusinessCapability("BANK_LIST")).toBe(false)
  })
})
