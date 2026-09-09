import { describe, it, expect, afterEach } from "vitest"
import {
  computeFinancialReadiness,
  type ReadinessInputs,
  type ReadinessAccountSnapshot,
} from "./finance.readiness.compute"

/*
 * computeFinancialReadiness is pure — every input is supplied here, so no
 * DB. The environment guard reads env.NODE_ENV; the test harness runs with
 * NODE_ENV=test => expected provider environment is TEST.
 *
 * Routing is capability-scoped: collection/payout each resolve their own
 * payment method's wired provider account; bank verification resolves the
 * country-global bankVerificationProviderAccount. There is no single
 * "active account" — these tests exercise the per-capability model.
 */

function account(caps: string[], overrides: Partial<ReadinessAccountSnapshot> = {}): ReadinessAccountSnapshot {
  return {
    status: "ACTIVE",
    providerStatus: "ACTIVE",
    environment: "TEST",
    enabledCapabilities: caps,
    adapterAvailable: true,
    credentialsResolvable: true,
    ...overrides,
  }
}

const collectionAccount = () => account(["COLLECTION_CARD", "COLLECTION_MOBILE_MONEY"])
const payoutAccount = () => account(["PAYOUT_BANK"])
const bankVerificationAccount = () => account(["BANK_ACCOUNT_RESOLUTION"])

const FULLY_READY: ReadinessInputs = {
  config: { status: "ACTIVE", currencyCode: "KES", collectionsEnabled: true, payoutsEnabled: true, bankVerificationMode: "PROVIDER" },
  currency: { status: "ACTIVE" },
  inboundMethods: [
    { type: "CARD", account: collectionAccount() },
    { type: "MOBILE_MONEY", account: collectionAccount() },
  ],
  outboundMethods: [{ type: "BANK", account: payoutAccount() }],
  bankVerificationAccount: bankVerificationAccount(),
}

function inputs(overrides: Partial<ReadinessInputs>): ReadinessInputs {
  return { ...structuredClone(FULLY_READY), ...overrides }
}

describe("computeFinancialReadiness — happy path", () => {
  it("a fully-configured country is collection-, payout-, bank-verification- and financially ready", () => {
    const r = computeFinancialReadiness("ke", FULLY_READY)
    expect(r.collection).toEqual({ ready: true, reasons: [] })
    expect(r.payout).toEqual({ ready: true, reasons: [] })
    expect(r.bankVerification).toEqual({ ready: true, reasons: [] })
    expect(r.financiallyReady).toBe(true)
    expect(r.reasons).toEqual([])
  })

  it("different capabilities may route through different provider accounts", () => {
    // Collection via one provider, payout via another, verification via a third.
    const r = computeFinancialReadiness("ke", inputs({
      inboundMethods: [{ type: "MOBILE_MONEY", account: account(["COLLECTION_MOBILE_MONEY"]) }],
      outboundMethods: [{ type: "BANK", account: account(["PAYOUT_BANK"]) }],
      bankVerificationAccount: account(["BANK_ACCOUNT_RESOLUTION"]),
    }))
    expect(r.financiallyReady).toBe(true)
  })
})

describe("computeFinancialReadiness — base prerequisites", () => {
  it("missing config → everything fails with FINANCIAL_CONFIG_MISSING and nothing else noisy", () => {
    const r = computeFinancialReadiness("ke", inputs({ config: null, currency: null }))
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

  it("currency not configured / inactive", () => {
    expect(
      computeFinancialReadiness("ke", inputs({ config: { ...FULLY_READY.config!, currencyCode: null }, currency: null })).reasons,
    ).toContain("CURRENCY_NOT_CONFIGURED")
    expect(
      computeFinancialReadiness("ke", inputs({ currency: { status: "INACTIVE" } })).reasons,
    ).toContain("CURRENCY_INACTIVE")
  })
})

describe("computeFinancialReadiness — collection routing", () => {
  it("collections disabled", () => {
    const r = computeFinancialReadiness("ke", inputs({ config: { ...FULLY_READY.config!, collectionsEnabled: false } }))
    expect(r.collection.ready).toBe(false)
    expect(r.collection.reasons).toContain("COLLECTIONS_DISABLED")
    expect(r.payout.ready).toBe(true)
    expect(r.financiallyReady).toBe(false)
  })

  it("no inbound method's wired account enables any collection capability", () => {
    const r = computeFinancialReadiness("ke", inputs({
      inboundMethods: [
        { type: "CARD", account: account(["PAYOUT_BANK"]) },
        { type: "MOBILE_MONEY", account: account(["PAYOUT_BANK"]) },
      ],
    }))
    expect(r.collection.reasons).toContain("NO_COLLECTION_CAPABILITY")
    expect(r.collection.reasons).toContain("NO_VALID_INBOUND_PAYMENT_METHOD")
  })

  it("inbound method type has no matching enabled capability on its account", () => {
    const r = computeFinancialReadiness("ke", inputs({
      inboundMethods: [{ type: "CARD", account: account(["COLLECTION_BANK_TRANSFER"]) }],
    }))
    expect(r.collection.reasons).toContain("NO_VALID_INBOUND_PAYMENT_METHOD")
    expect(r.collection.reasons).not.toContain("NO_COLLECTION_CAPABILITY")
  })

  it("no inbound methods at all", () => {
    const r = computeFinancialReadiness("ke", inputs({ inboundMethods: [] }))
    expect(r.collection.reasons).toContain("NO_VALID_INBOUND_PAYMENT_METHOD")
  })

  it("a serviceable inbound method exists but is not wired to any provider account", () => {
    const r = computeFinancialReadiness("ke", inputs({
      inboundMethods: [
        { type: "CARD", account: null },
        { type: "MOBILE_MONEY", account: null },
      ],
    }))
    expect(r.collection.reasons).toContain("NO_INBOUND_METHOD_WIRED_TO_PROVIDER")
    expect(r.collection.reasons).not.toContain("NO_VALID_INBOUND_PAYMENT_METHOD")
    expect(r.collection.ready).toBe(false)
  })

  it("the wired, capability-matched collection account is unhealthy → surfaces why", () => {
    const r = computeFinancialReadiness("ke", inputs({
      inboundMethods: [{ type: "CARD", account: account(["COLLECTION_CARD"], { adapterAvailable: false }) }],
    }))
    expect(r.collection.reasons).toContain("PROVIDER_ADAPTER_UNAVAILABLE")
    expect(r.collection.ready).toBe(false)
  })

  it("collection routing is independent of the payout / bank-verification accounts", () => {
    // Payout + verification accounts broken; collection still ready.
    const r = computeFinancialReadiness("ke", inputs({
      outboundMethods: [{ type: "BANK", account: account(["PAYOUT_BANK"], { status: "SUSPENDED" }) }],
      bankVerificationAccount: null,
    }))
    expect(r.collection.ready).toBe(true)
  })
})

describe("computeFinancialReadiness — payout routing", () => {
  it("payouts disabled", () => {
    const r = computeFinancialReadiness("ke", inputs({ config: { ...FULLY_READY.config!, payoutsEnabled: false } }))
    expect(r.payout.reasons).toContain("PAYOUTS_DISABLED")
    expect(r.collection.ready).toBe(true)
    expect(r.financiallyReady).toBe(false)
  })

  it("no outbound method's account enables a payout capability", () => {
    const r = computeFinancialReadiness("ke", inputs({
      outboundMethods: [{ type: "BANK", account: account(["COLLECTION_CARD"]) }],
    }))
    expect(r.payout.reasons).toContain("NO_PAYOUT_CAPABILITY")
    expect(r.payout.reasons).toContain("NO_VALID_OUTBOUND_PAYOUT_METHOD")
  })

  it("no outbound methods at all", () => {
    const r = computeFinancialReadiness("ke", inputs({ outboundMethods: [] }))
    expect(r.payout.reasons).toContain("NO_VALID_OUTBOUND_PAYOUT_METHOD")
  })

  it("outbound BANK method wired, but no bank-verification account bound", () => {
    const r = computeFinancialReadiness("ke", inputs({ bankVerificationAccount: null }))
    expect(r.payout.reasons).toContain("NO_BANK_VERIFICATION_CAPABILITY")
    expect(r.payout.ready).toBe(false)
    expect(r.bankVerification.ready).toBe(false)
  })

  it("outbound BANK method wired, bank-verification account bound but missing the capability", () => {
    const r = computeFinancialReadiness("ke", inputs({
      bankVerificationAccount: account(["PAYOUT_BANK"]),
    }))
    expect(r.payout.reasons).toContain("NO_BANK_VERIFICATION_CAPABILITY")
    expect(r.bankVerification.reasons).toContain("NO_BANK_VERIFICATION_CAPABILITY")
  })

  it("a MOBILE_MONEY-only payout country needs no bank verification", () => {
    const r = computeFinancialReadiness("ke", inputs({
      outboundMethods: [{ type: "MOBILE_MONEY", account: account(["PAYOUT_MOBILE_MONEY"]) }],
      bankVerificationAccount: null,
    }))
    expect(r.payout.ready).toBe(true)
    expect(r.payout.reasons).not.toContain("NO_BANK_VERIFICATION_CAPABILITY")
    expect(r.bankVerification.ready).toBe(false) // still reported, just not a payout blocker
  })

  it("an outbound method that is not wired to any provider account", () => {
    const r = computeFinancialReadiness("ke", inputs({
      outboundMethods: [{ type: "BANK", account: null }],
    }))
    expect(r.payout.reasons).toContain("NO_OUTBOUND_METHOD_WIRED_TO_PROVIDER")
    expect(r.payout.reasons).not.toContain("NO_VALID_OUTBOUND_PAYOUT_METHOD")
  })
})

describe("computeFinancialReadiness — bank verification dimension", () => {
  it("no bank-verification account bound → PROVIDER_ACCOUNT_NOT_CONFIGURED", () => {
    const r = computeFinancialReadiness("ke", inputs({ bankVerificationAccount: null }))
    expect(r.bankVerification.reasons).toContain("PROVIDER_ACCOUNT_NOT_CONFIGURED")
  })

  it("bound bank-verification account is unhealthy", () => {
    const r = computeFinancialReadiness("ke", inputs({
      bankVerificationAccount: account(["BANK_ACCOUNT_RESOLUTION"], { credentialsResolvable: false }),
    }))
    expect(r.bankVerification.reasons).toContain("PROVIDER_CREDENTIALS_UNRESOLVED")
    expect(r.bankVerification.ready).toBe(false)
  })

  it("bound bank-verification account on the wrong environment", () => {
    const r = computeFinancialReadiness("ke", inputs({
      bankVerificationAccount: account(["BANK_ACCOUNT_RESOLUTION"], { environment: "LIVE" }),
    }))
    expect(r.bankVerification.reasons).toContain("PROVIDER_ENVIRONMENT_MISMATCH")
  })
})

describe("computeFinancialReadiness — reasons are deduped", () => {
  it("top-level reasons contains no duplicates", () => {
    const r = computeFinancialReadiness("ke", inputs({ config: null, currency: null, bankVerificationAccount: null }))
    expect(new Set(r.reasons).size).toBe(r.reasons.length)
  })
})

describe("environment guard respects NODE_ENV", () => {
  const original = process.env.NODE_ENV
  afterEach(() => { process.env.NODE_ENV = original })

  it("in production, a TEST-environment collection account is an environment mismatch", () => {
    process.env.NODE_ENV = "production"
    const r = computeFinancialReadiness("ke", FULLY_READY)
    expect(r.reasons).toContain("PROVIDER_ENVIRONMENT_MISMATCH")
  })

  it("in test/dev, a LIVE-environment collection account is an environment mismatch", () => {
    process.env.NODE_ENV = "test"
    const r = computeFinancialReadiness("ke", inputs({
      inboundMethods: [{ type: "CARD", account: account(["COLLECTION_CARD"], { environment: "LIVE" }) }],
    }))
    expect(r.collection.reasons).toContain("PROVIDER_ENVIRONMENT_MISMATCH")
  })
})

/*
 * MANUAL bank-verification mode — markets where no payment provider can
 * resolve a bank account (Kenya/KES: confirmed against dLocal, Flutterwave,
 * Paystack and Fincra). Document + admin review is the verification path,
 * so readiness must NOT demand a provider account.
 */
describe("computeFinancialReadiness — MANUAL bank verification mode", () => {
  const manual = (over: Partial<ReadinessInputs> = {}) =>
    inputs({
      config: { ...FULLY_READY.config!, bankVerificationMode: "MANUAL" },
      bankVerificationAccount: null,
      ...over,
    })

  it("is bank-verification ready with NO provider account bound", () => {
    const r = computeFinancialReadiness("ke", manual())
    expect(r.bankVerification.ready).toBe(true)
    expect(r.bankVerification.reasons).toEqual([])
  })

  it("does not block payout for a BANK outbound method", () => {
    const r = computeFinancialReadiness("ke", manual())
    expect(r.payout.reasons).not.toContain("NO_BANK_VERIFICATION_CAPABILITY")
    expect(r.payout.ready).toBe(true)
    expect(r.financiallyReady).toBe(true)
  })

  it("still enforces the shared config/currency prerequisites", () => {
    const r = computeFinancialReadiness("ke", manual({ currency: { status: "INACTIVE" } }))
    expect(r.bankVerification.ready).toBe(false)
    expect(r.bankVerification.reasons).toContain("CURRENCY_INACTIVE")
  })

  it("ignores a bound provider account entirely (mode decides, not the binding)", () => {
    const r = computeFinancialReadiness("ke", manual({ bankVerificationAccount: account([], { status: "DISABLED" }) }))
    expect(r.bankVerification.ready).toBe(true)
  })

  it("PROVIDER mode with no account bound still fails (the mode is the only difference)", () => {
    const r = computeFinancialReadiness("ke", inputs({ bankVerificationAccount: null }))
    expect(r.bankVerification.ready).toBe(false)
    expect(r.bankVerification.reasons).toContain("PROVIDER_ACCOUNT_NOT_CONFIGURED")
    expect(r.payout.reasons).toContain("NO_BANK_VERIFICATION_CAPABILITY")
  })
})
