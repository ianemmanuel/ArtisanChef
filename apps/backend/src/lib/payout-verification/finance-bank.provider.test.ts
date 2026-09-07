import { describe, it, expect } from "vitest"
import { createFinanceBankVerificationProvider, type BankResolutionGateway } from "./finance-bank.provider"
import { ProviderError } from "@/modules/finance/providers/provider.errors"
import { ApiError } from "@/errors/ApiError"
import type { PayoutVerificationInput } from "./types"

/*
 * No @repo/db import anywhere in this file or in finance-bank.provider.ts's
 * own imports — the gateway is a fake, matching the FakeHttp pattern
 * flutterwave.adapter.test.ts already uses for the same reason (spec §23).
 */

const BANK_INPUT: PayoutVerificationInput = {
  methodType       : "BANK",
  accountHolderName: "Jane Wanjiku",
  bankName         : "Test Bank",
  bankCode         : "011",
  accountNumber    : "1234567890",
  countryId        : "country-1",
  currency         : "KES",
}

function gatewayThatResolves(accountName: string, bankName?: string): BankResolutionGateway {
  return {
    async resolveBankAccount(_countryId, input) {
      return { accountNumber: input.accountNumber, accountName, bankCode: input.bankCode, bankName }
    },
  }
}

function gatewayThatThrows(err: unknown): BankResolutionGateway {
  return {
    async resolveBankAccount() {
      throw err
    },
  }
}

describe("financeBankVerificationProvider", () => {
  it("VERIFIED when the gateway resolves the account", async () => {
    const provider = createFinanceBankVerificationProvider(gatewayThatResolves("Jane W", "Test Bank"))
    const outcome = await provider.verify(BANK_INPUT)
    expect(outcome.status).toBe("VERIFIED")
    expect(outcome.method).toBe("FINANCE_BANK_RESOLUTION")
    expect(outcome.meta?.verifiedAccountName).toBe("Jane W")
    expect(outcome.meta?.verifiedBankName).toBe("Test Bank")
  })

  it("never puts the raw account number or bank code into meta", async () => {
    const provider = createFinanceBankVerificationProvider(gatewayThatResolves("Jane W"))
    const outcome = await provider.verify(BANK_INPUT)
    const serialized = JSON.stringify(outcome.meta)
    expect(serialized).not.toContain(BANK_INPUT.accountNumber)
    expect(serialized).not.toContain(BANK_INPUT.bankCode)
  })

  it("FAILED when the provider declines/rejects the account (TRANSACTION_DECLINED)", async () => {
    const err = new ProviderError("TRANSACTION_DECLINED", "declined", "FLUTTERWAVE")
    const provider = createFinanceBankVerificationProvider(gatewayThatThrows(err))
    const outcome = await provider.verify(BANK_INPUT)
    expect(outcome.status).toBe("FAILED")
    expect(outcome.reason).not.toMatch(/flutterwave/i)
  })

  it("REQUIRES_REVIEW on a BARE INVALID_REQUEST (no field detail — could be a bad account or our request)", async () => {
    const err = new ProviderError("INVALID_REQUEST", "bad request", "FLUTTERWAVE")
    const provider = createFinanceBankVerificationProvider(gatewayThatThrows(err))
    const outcome = await provider.verify(BANK_INPUT)
    expect(outcome.status).toBe("REQUIRES_REVIEW")
    expect(outcome.failureCode).toBe("PROVIDER_REJECTED")
  })

  it("FAILED (INVALID_ACCOUNT) when the provider rejected a specific FIELD — the vendor can fix it", async () => {
    const err = new ProviderError("INVALID_REQUEST", "bad request", "FLUTTERWAVE", { fieldValidation: true })
    const provider = createFinanceBankVerificationProvider(gatewayThatThrows(err))
    const outcome = await provider.verify(BANK_INPUT)
    expect(outcome.status).toBe("FAILED")
    expect(outcome.failureCode).toBe("INVALID_ACCOUNT")
  })

  it("REQUIRES_REVIEW when the provider is unreachable (PROVIDER_UNAVAILABLE) — never silently FAILED or VERIFIED", async () => {
    const err = new ProviderError("PROVIDER_UNAVAILABLE", "down", "FLUTTERWAVE")
    const provider = createFinanceBankVerificationProvider(gatewayThatThrows(err))
    const outcome = await provider.verify(BANK_INPUT)
    expect(outcome.status).toBe("REQUIRES_REVIEW")
  })

  it("REQUIRES_REVIEW on a timeout", async () => {
    const err = new ProviderError("TIMEOUT", "timed out", "FLUTTERWAVE")
    const provider = createFinanceBankVerificationProvider(gatewayThatThrows(err))
    const outcome = await provider.verify(BANK_INPUT)
    expect(outcome.status).toBe("REQUIRES_REVIEW")
  })

  it("REQUIRES_REVIEW on an authentication/config failure", async () => {
    const err = new ProviderError("AUTHENTICATION", "bad creds", "FLUTTERWAVE")
    const provider = createFinanceBankVerificationProvider(gatewayThatThrows(err))
    const outcome = await provider.verify(BANK_INPUT)
    expect(outcome.status).toBe("REQUIRES_REVIEW")
  })

  it("falls back to PENDING (manual review) when the provider can't verify this currency at all — tagged PROVIDER_UNSUPPORTED", async () => {
    const err = new ProviderError("UNSUPPORTED_CAPABILITY", "not supported", "FLUTTERWAVE")
    const provider = createFinanceBankVerificationProvider(gatewayThatThrows(err))
    const outcome = await provider.verify(BANK_INPUT)
    expect(outcome.status).toBe("PENDING")
    expect(outcome.method).toBe("FORMAT_CHECKS")
    expect(outcome.failureCode).toBe("PROVIDER_UNSUPPORTED")
  })

  it("falls back to the offline structural result when the country has no finance config yet (ApiError)", async () => {
    const err = new ApiError(409, "This country's financial configuration is not active", "FINANCE_NOT_ACTIVE")
    const provider = createFinanceBankVerificationProvider(gatewayThatThrows(err))
    const outcome = await provider.verify(BANK_INPUT)
    expect(outcome.status).toBe("PENDING")
    expect(outcome.method).toBe("FORMAT_CHECKS")
  })

  it("rethrows a genuinely unexpected error instead of hiding it as PENDING", async () => {
    const provider = createFinanceBankVerificationProvider(gatewayThatThrows(new TypeError("boom")))
    await expect(provider.verify(BANK_INPUT)).rejects.toThrow("boom")
  })

  it("structural failure (bad IBAN/short account number) short-circuits before ever calling the gateway", async () => {
    let called = false
    const gateway: BankResolutionGateway = {
      async resolveBankAccount() {
        called = true
        return { accountNumber: "x", accountName: "x", bankCode: "x" }
      },
    }
    const provider = createFinanceBankVerificationProvider(gateway)
    const outcome = await provider.verify({ ...BANK_INPUT, accountNumber: "12" }) // too short
    expect(outcome.status).toBe("FAILED")
    expect(outcome.fieldErrors?.length).toBeGreaterThan(0)
    expect(called).toBe(false)
  })

  it("non-BANK method types never call the gateway — offline result only", async () => {
    let called = false
    const gateway: BankResolutionGateway = {
      async resolveBankAccount() {
        called = true
        return { accountNumber: "x", accountName: "x", bankCode: "x" }
      },
    }
    const provider = createFinanceBankVerificationProvider(gateway)
    const outcome = await provider.verify({
      methodType: "MOBILE_MONEY", accountHolderName: "Jane", mobileNumber: "0712345678",
    })
    expect(called).toBe(false)
    expect(outcome.status).toBe("PENDING")
  })

  it("a BANK account missing countryId/currency never calls the gateway", async () => {
    let called = false
    const gateway: BankResolutionGateway = {
      async resolveBankAccount() {
        called = true
        return { accountNumber: "x", accountName: "x", bankCode: "x" }
      },
    }
    const provider = createFinanceBankVerificationProvider(gateway)
    const outcome = await provider.verify({ ...BANK_INPUT, countryId: undefined, currency: undefined })
    expect(called).toBe(false)
    expect(outcome.status).toBe("PENDING")
  })
})
