import { ApiError } from "@/errors/ApiError"
import { isProviderError } from "@/modules/finance/providers/provider.errors"
import type { VendorPayoutBankOption, VendorSupportedBanks } from "@repo/types/backend"

/*
 * Vendor 1E — the pure decision core behind listSupportedBanks
 * (vendor.payout.service.ts). Same rationale/shape as
 * lib/payout-verification/finance-bank.provider.ts: the actual Finance call
 * is injected (not imported at module scope), so this file carries no
 * @repo/db dependency and is unit-testable without a database.
 *
 * "supported: false" vs. a thrown ApiError is the one decision this file
 * owns: a country simply not configured for BANK_LIST yet is an expected,
 * normal state (§3 — "return a normalized unsupported-capability response");
 * an actual provider/transport failure is a real error the vendor should
 * see as one, not a silently empty list.
 */

export interface BankListGateway {
  listBanks(countryId: string, countryCode: string): Promise<VendorPayoutBankOption[]>
}

export async function resolveSupportedBanks(
  gateway    : BankListGateway,
  countryId  : string,
  countryCode: string,
): Promise<VendorSupportedBanks> {
  try {
    const banks = await gateway.listBanks(countryId, countryCode)
    return { supported: true, banks }
  } catch (err) {
    if (isProviderError(err)) {
      // A real attempt was made and the provider/transport failed — a
      // genuine error, converted via the provider's own safe mapping so no
      // raw provider text reaches the vendor.
      throw err.toApiError()
    }
    if (err instanceof ApiError) {
      // resolveProviderGateway's "not configured for this yet" errors
      // (financial config inactive, no bank-verification provider account
      // bound, capability not enabled, credentials unresolved) — expected,
      // not a failure.
      return { supported: false, banks: [] }
    }
    throw err
  }
}
