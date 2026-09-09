import { describe, it, expect } from "vitest"
import { resolveSupportedBanks, type BankListGateway } from "./vendor.payoutBanks"
import { ProviderError } from "@/modules/finance/providers/provider.errors"
import { ApiError } from "@/errors/ApiError"

/*
 * No @repo/db import anywhere in this file or in vendor.payoutBanks.ts's own
 * imports — the gateway is a fake, same DI convention as
 * finance-bank.provider.test.ts.
 */

function gatewayThatResolves(banks: { code: string; name: string }[]): BankListGateway {
  return { async listBanks() { return banks } }
}

function gatewayThatThrows(err: unknown): BankListGateway {
  return {
    async listBanks() {
      throw err
    },
  }
}

describe("resolveSupportedBanks", () => {
  it("supported: true with the normalized bank list on success", async () => {
    const gateway = gatewayThatResolves([{ code: "044", name: "Access Bank" }])
    const result = await resolveSupportedBanks(gateway, "country-1", "KE", "cpm-1")
    expect(result).toEqual({ supported: true, banks: [{ code: "044", name: "Access Bank" }] })
  })

  it("supported: false (not an error) when the country has no bank-list capability configured (ApiError)", async () => {
    const err = new ApiError(409, "This country's financial configuration is not active", "FINANCE_NOT_ACTIVE")
    const result = await resolveSupportedBanks(gatewayThatThrows(err), "country-1", "KE", "cpm-1")
    expect(result).toEqual({ supported: false, banks: [] })
  })

  it("supported: false when the configured provider doesn't enable BANK_LIST (capability-not-enabled ApiError)", async () => {
    const err = new ApiError(422, "not enabled", "PROVIDER_CAPABILITY_NOT_ENABLED")
    const result = await resolveSupportedBanks(gatewayThatThrows(err), "country-1", "KE", "cpm-1")
    expect(result.supported).toBe(false)
  })

  it("rethrows a real provider failure (ProviderError) as an ApiError — never a silent empty list", async () => {
    const err = new ProviderError("PROVIDER_UNAVAILABLE", "down", "FLUTTERWAVE")
    await expect(resolveSupportedBanks(gatewayThatThrows(err), "country-1", "KE", "cpm-1")).rejects.toMatchObject({
      statusCode: 503,
      code: "PROVIDER_UNAVAILABLE",
    })
  })

  it("never leaks raw provider error text into the thrown ApiError", async () => {
    const err = new ProviderError("PROVIDER_UNAVAILABLE", "Flutterwave said something internal", "FLUTTERWAVE", {
      providerMessage: "super secret internal detail",
    })
    try {
      await resolveSupportedBanks(gatewayThatThrows(err), "country-1", "KE", "cpm-1")
      throw new Error("expected rejection")
    } catch (e) {
      expect(String((e as Error).message)).not.toContain("super secret internal detail")
    }
  })

  it("rethrows a genuinely unexpected error instead of hiding it as unsupported", async () => {
    await expect(resolveSupportedBanks(gatewayThatThrows(new TypeError("boom")), "country-1", "KE", "cpm-1")).rejects.toThrow("boom")
  })

  /*
   * BANK_LIST is PAYMENT_METHOD-routed — the directory comes from the
   * provider that will execute the payout — so the chosen method travels
   * with the call as routing context and must reach the gateway intact.
   */
  it("passes countryId, countryCode AND the payout method through to the gateway unchanged", async () => {
    let seen: [string, string, string] | null = null
    const gateway: BankListGateway = {
      async listBanks(countryId, countryCode, countryPaymentMethodId) {
        seen = [countryId, countryCode, countryPaymentMethodId]
        return []
      },
    }
    await resolveSupportedBanks(gateway, "country-42", "NG", "cpm-99")
    expect(seen).toEqual(["country-42", "NG", "cpm-99"])
  })
})
