import { describe, it, expect } from "vitest"
import { methodProviderAccountProblem } from "../providers/provider.capabilities"

/*
 * Pure compatibility rule for wiring a CountryPaymentMethod to a
 * CountryProviderAccount. The cross-country guarantee is DB-enforced (the
 * composite FK) + a 404 in the service; this only covers capability/status.
 */

const activeAccount = (caps: string[]) => ({ status: "ACTIVE", enabledCapabilities: caps })

describe("methodProviderAccountProblem", () => {
  it("allows unlink (null account) always", () => {
    expect(methodProviderAccountProblem({ methodType: "CARD", direction: "INBOUND", account: null })).toBeNull()
  })

  it("allows an INBOUND mobile-money method on an account enabling COLLECTION_MOBILE_MONEY", () => {
    expect(
      methodProviderAccountProblem({
        methodType: "MOBILE_MONEY",
        direction: "INBOUND",
        account: activeAccount(["COLLECTION_MOBILE_MONEY", "PAYOUT_BANK"]),
      }),
    ).toBeNull()
  })

  it("allows an OUTBOUND bank method on an account enabling PAYOUT_BANK", () => {
    expect(
      methodProviderAccountProblem({
        methodType: "BANK",
        direction: "OUTBOUND",
        account: activeAccount(["PAYOUT_BANK"]),
      }),
    ).toBeNull()
  })

  it("rejects when the required capability is not enabled", () => {
    expect(
      methodProviderAccountProblem({
        methodType: "CARD",
        direction: "INBOUND",
        account: activeAccount(["COLLECTION_MOBILE_MONEY"]),
      }),
    ).toBe("CAPABILITY_NOT_ENABLED")
  })

  it("rejects a disabled account", () => {
    expect(
      methodProviderAccountProblem({
        methodType: "CARD",
        direction: "INBOUND",
        account: { status: "DISABLED", enabledCapabilities: ["COLLECTION_CARD"] },
      }),
    ).toBe("ACCOUNT_DISABLED")
  })

  it("rejects a non-payable combination (OUTBOUND card)", () => {
    expect(
      methodProviderAccountProblem({
        methodType: "CARD",
        direction: "OUTBOUND",
        account: activeAccount(["COLLECTION_CARD", "PAYOUT_BANK"]),
      }),
    ).toBe("METHOD_NOT_PAYABLE")
  })
})
