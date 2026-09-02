import { describe, it, expect, afterEach } from "vitest"
import { computeFinancialReadiness, type ReadinessInputs } from "./finance.readiness.compute"

/*
 * computeFinancialReadiness is pure — every input is supplied here, so no
 * DB. The environment guard reads env.NODE_ENV; the test harness runs with
 * NODE_ENV=test => expected provider environment is TEST.
 */

const FULLY_READY: ReadinessInputs = {
  config: { status: "ACTIVE", currencyCode: "KES", collectionsEnabled: true, payoutsEnabled: true },
  currency: { status: "ACTIVE" },
  providerAccount: {
    status: "ACTIVE",
    environment: "TEST",
    enabledCapabilities: ["COLLECTION_CARD", "COLLECTION_MOBILE_MONEY", "PAYOUT_BANK", "BANK_ACCOUNT_RESOLUTION"],
    providerStatus: "ACTIVE",
    adapterAvailable: true,
    credentialsResolvable: true,
  },
  inboundMethods: [
    { type: "CARD", wiredToActiveAccount: true },
    { type: "MOBILE_MONEY", wiredToActiveAccount: true },
  ],
  outboundMethods: [{ type: "BANK", wiredToActiveAccount: true }],
}

function inputs(overrides: Partial<ReadinessInputs>): ReadinessInputs {
  return { ...structuredClone(FULLY_READY), ...overrides }
}

describe("computeFinancialReadiness — happy path", () => {
  it("a fully-configured country is collection-ready, payout-ready, bank-verification-ready and financially ready", () => {
    const r = computeFinancialReadiness("ke", FULLY_READY)
    expect(r.collection).toEqual({ ready: true, reasons: [] })
    expect(r.payout).toEqual({ ready: true, reasons: [] })
    expect(r.bankVerification).toEqual({ ready: true, reasons: [] })
    expect(r.financiallyReady).toBe(true)
    expect(r.reasons).toEqual([])
  })
})

describe("computeFinancialReadiness — base prerequisites", () => {
  it("missing config → everything fails with FINANCIAL_CONFIG_MISSING and nothing else noisy", () => {
    const r = computeFinancialReadiness("ke", inputs({ config: null, currency: null, providerAccount: null }))
    expect(r.financiallyReady).toBe(false)
    expect(r.collection.reasons).toContain("FINANCIAL_CONFIG_MISSING")
    expect(r.payout.reasons).toContain("FINANCIAL_CONFIG_MISSING")
    expect(r.bankVerification.reasons).toContain("FINANCIAL_CONFIG_MISSING")
    expect(r.collection.reasons).not.toContain("CURRENCY_NOT_CONFIGURED")
  })

  it("config not ACTIVE → FINANCIAL_CONFIG_NOT_ACTIVE on every dimension", () => {
    const r = computeFinancialReadiness("ke", inputs({ config: { ...FULLY_READY.config!, status: "DRAFT" } }))
    expect(r.reasons).toContain("FINANCIAL_CONFIG_NOT_ACTIVE")
    expect(r.financiallyReady).toBe(false)
  })

  it("currency not configured", () => {
    const r = computeFinancialReadiness("ke", inputs({ config: { ...FULLY_READY.config!, currencyCode: null }, currency: null }))
    expect(r.reasons).toContain("CURRENCY_NOT_CONFIGURED")
  })

  it("currency inactive", () => {
    const r = computeFinancialReadiness("ke", inputs({ currency: { status: "INACTIVE" } }))
    expect(r.reasons).toContain("CURRENCY_INACTIVE")
  })

  it("no provider account", () => {
    const r = computeFinancialReadiness("ke", inputs({ providerAccount: null }))
    expect(r.reasons).toContain("PROVIDER_ACCOUNT_NOT_CONFIGURED")
  })

  it("provider account not active", () => {
    const r = computeFinancialReadiness("ke", inputs({ providerAccount: { ...FULLY_READY.providerAccount!, status: "SUSPENDED" } }))
    expect(r.reasons).toContain("PROVIDER_ACCOUNT_NOT_ACTIVE")
  })

  it("provider (catalog) inactive", () => {
    const r = computeFinancialReadiness("ke", inputs({ providerAccount: { ...FULLY_READY.providerAccount!, providerStatus: "INACTIVE" } }))
    expect(r.reasons).toContain("PROVIDER_INACTIVE")
  })

  it("provider environment mismatch (LIVE account on a test deployment)", () => {
    const r = computeFinancialReadiness("ke", inputs({ providerAccount: { ...FULLY_READY.providerAccount!, environment: "LIVE" } }))
    expect(r.reasons).toContain("PROVIDER_ENVIRONMENT_MISMATCH")
  })

  it("Phase 1C — no registered adapter for the provider", () => {
    const r = computeFinancialReadiness("ke", inputs({ providerAccount: { ...FULLY_READY.providerAccount!, adapterAvailable: false } }))
    expect(r.reasons).toContain("PROVIDER_ADAPTER_UNAVAILABLE")
    expect(r.financiallyReady).toBe(false)
  })

  it("Phase 1C — provider credentials cannot be resolved", () => {
    const r = computeFinancialReadiness("ke", inputs({ providerAccount: { ...FULLY_READY.providerAccount!, credentialsResolvable: false } }))
    expect(r.reasons).toContain("PROVIDER_CREDENTIALS_UNRESOLVED")
    expect(r.financiallyReady).toBe(false)
  })
})

describe("computeFinancialReadiness — collection", () => {
  it("collections disabled", () => {
    const r = computeFinancialReadiness("ke", inputs({ config: { ...FULLY_READY.config!, collectionsEnabled: false } }))
    expect(r.collection.ready).toBe(false)
    expect(r.collection.reasons).toContain("COLLECTIONS_DISABLED")
    expect(r.payout.ready).toBe(true)
    expect(r.financiallyReady).toBe(false)
  })

  it("no collection capability enabled", () => {
    const r = computeFinancialReadiness("ke", inputs({
      providerAccount: { ...FULLY_READY.providerAccount!, enabledCapabilities: ["PAYOUT_BANK", "BANK_ACCOUNT_RESOLUTION"] },
    }))
    expect(r.collection.reasons).toContain("NO_COLLECTION_CAPABILITY")
    expect(r.collection.reasons).toContain("NO_VALID_INBOUND_PAYMENT_METHOD")
  })

  it("inbound method type has no matching enabled capability", () => {
    const r = computeFinancialReadiness("ke", inputs({
      providerAccount: { ...FULLY_READY.providerAccount!, enabledCapabilities: ["COLLECTION_BANK_TRANSFER", "PAYOUT_BANK", "BANK_ACCOUNT_RESOLUTION"] },
      inboundMethods: [{ type: "CARD", wiredToActiveAccount: true }],
    }))
    expect(r.collection.reasons).toContain("NO_VALID_INBOUND_PAYMENT_METHOD")
    expect(r.collection.reasons).not.toContain("NO_COLLECTION_CAPABILITY")
  })

  it("no inbound methods at all", () => {
    const r = computeFinancialReadiness("ke", inputs({ inboundMethods: [] }))
    expect(r.collection.reasons).toContain("NO_VALID_INBOUND_PAYMENT_METHOD")
  })

  it("Phase 1C — a usable inbound method exists but is not wired to the active provider account", () => {
    const r = computeFinancialReadiness("ke", inputs({
      inboundMethods: [
        { type: "CARD", wiredToActiveAccount: false },
        { type: "MOBILE_MONEY", wiredToActiveAccount: false },
      ],
    }))
    expect(r.collection.reasons).toContain("NO_INBOUND_METHOD_WIRED_TO_PROVIDER")
    expect(r.collection.reasons).not.toContain("NO_VALID_INBOUND_PAYMENT_METHOD")
    expect(r.collection.ready).toBe(false)
  })
})

describe("computeFinancialReadiness — payout", () => {
  it("payouts disabled", () => {
    const r = computeFinancialReadiness("ke", inputs({ config: { ...FULLY_READY.config!, payoutsEnabled: false } }))
    expect(r.payout.reasons).toContain("PAYOUTS_DISABLED")
    expect(r.collection.ready).toBe(true)
    expect(r.financiallyReady).toBe(false)
  })

  it("no payout capability enabled", () => {
    const r = computeFinancialReadiness("ke", inputs({
      providerAccount: { ...FULLY_READY.providerAccount!, enabledCapabilities: ["COLLECTION_CARD", "COLLECTION_MOBILE_MONEY"] },
    }))
    expect(r.payout.reasons).toContain("NO_PAYOUT_CAPABILITY")
    expect(r.payout.reasons).toContain("NO_VALID_OUTBOUND_PAYOUT_METHOD")
  })

  it("bank payout is the launch method but BANK_ACCOUNT_RESOLUTION is not enabled", () => {
    const r = computeFinancialReadiness("ke", inputs({
      providerAccount: { ...FULLY_READY.providerAccount!, enabledCapabilities: ["COLLECTION_CARD", "PAYOUT_BANK"] },
    }))
    expect(r.payout.reasons).toContain("NO_BANK_VERIFICATION_CAPABILITY")
    expect(r.payout.ready).toBe(false)
    expect(r.bankVerification.ready).toBe(false)
  })

  it("no outbound methods at all", () => {
    const r = computeFinancialReadiness("ke", inputs({ outboundMethods: [] }))
    expect(r.payout.reasons).toContain("NO_VALID_OUTBOUND_PAYOUT_METHOD")
  })

  it("Phase 1C — a usable outbound method exists but is not wired to the active provider account", () => {
    const r = computeFinancialReadiness("ke", inputs({
      outboundMethods: [{ type: "BANK", wiredToActiveAccount: false }],
    }))
    expect(r.payout.reasons).toContain("NO_OUTBOUND_METHOD_WIRED_TO_PROVIDER")
    expect(r.payout.reasons).not.toContain("NO_VALID_OUTBOUND_PAYOUT_METHOD")
    expect(r.payout.ready).toBe(false)
  })
})

describe("computeFinancialReadiness — configured launch model is enough", () => {
  it("CARD + MOBILE_MONEY collection, BANK payout only — financially ready without every provider capability", () => {
    const r = computeFinancialReadiness("ke", FULLY_READY)
    expect(r.financiallyReady).toBe(true)
  })
})

describe("computeFinancialReadiness — reasons are deduped", () => {
  it("top-level reasons contains no duplicates", () => {
    const r = computeFinancialReadiness("ke", inputs({ config: null, currency: null, providerAccount: null }))
    expect(new Set(r.reasons).size).toBe(r.reasons.length)
  })
})

describe("environment guard respects NODE_ENV", () => {
  const original = process.env.NODE_ENV
  afterEach(() => { process.env.NODE_ENV = original })

  it("in production, a TEST provider account is an environment mismatch", () => {
    process.env.NODE_ENV = "production"
    const r = computeFinancialReadiness("ke", FULLY_READY)
    expect(r.reasons).toContain("PROVIDER_ENVIRONMENT_MISMATCH")
  })

  it("in test/dev, a LIVE provider account is an environment mismatch", () => {
    process.env.NODE_ENV = "test"
    const r = computeFinancialReadiness("ke", inputs({
      providerAccount: { ...FULLY_READY.providerAccount!, environment: "LIVE" },
    }))
    expect(r.reasons).toContain("PROVIDER_ENVIRONMENT_MISMATCH")
  })
})
