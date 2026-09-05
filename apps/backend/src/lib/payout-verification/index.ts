import type { PayoutVerificationProvider } from "./types"
import { formatChecksProvider } from "./format-checks.provider"
import { manualProvider } from "./manual.provider"
import { createFinanceBankVerificationProvider, type BankResolutionGateway } from "./finance-bank.provider"
import { resolveProviderGateway } from "@/modules/finance"

export * from "./types"
export * from "./checksums"
export { bestNameMatch } from "./name-match"
export { createFinanceBankVerificationProvider, type BankResolutionGateway } from "./finance-bank.provider"

/*
 * The one place the payout service resolves a verification provider — and,
 * as of Vendor 1D, the one place the payout domain touches Finance. The
 * gateway passed to createFinanceBankVerificationProvider is the only
 * concrete wiring of BankAccountResolutionCapability into the vendor
 * payout flow: resolve the country's provider gateway for the
 * BANK_ACCOUNT_RESOLUTION capability, then call it. Everything about which
 * provider that is, its credentials, and its request/response shape stays
 * inside Finance — this function never sees any of it.
 */
const financeGateway: BankResolutionGateway = {
  async resolveBankAccount(countryId, input) {
    const { adapter, ctx } = await resolveProviderGateway(countryId, "BANK_ACCOUNT_RESOLUTION")
    // resolveProviderGateway already asserts the adapter implements the
    // capability it validated (adapterSurfaceFor + the has()/undefined
    // check) before returning — bankResolution is guaranteed present here.
    return adapter.bankResolution!.resolveBankAccount(ctx, input)
  },
}

const financeBankVerificationProvider = createFinanceBankVerificationProvider(financeGateway)

export function getPayoutVerificationProvider(): PayoutVerificationProvider {
  return financeBankVerificationProvider
}

export { formatChecksProvider, manualProvider }
