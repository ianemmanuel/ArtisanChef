import { ApiError } from "@/errors/ApiError"
import { isProviderError } from "@/modules/finance/providers/provider.errors"
import type { NormalizedBankAccount } from "@/modules/finance/providers/provider.types"
import type { PayoutVerificationProvider, PayoutVerificationInput, PayoutVerificationOutcome } from "./types"
import { formatChecksProvider } from "./format-checks.provider"

/*
 * Vendor 1D — the Finance-backed payout verification provider. This is the
 * ONLY file in the vendor domain that knows a provider-backed bank
 * verification capability exists; everything downstream (risk decision,
 * VendorPayoutAccount status) only ever sees a PayoutVerificationOutcome.
 *
 * Ownership boundary (see the Vendor 1D + Finance 1D brief): Finance owns
 * the provider call itself (routing, credentials, the Flutterwave-specific
 * request/response shape, normalized errors) — none of that lives here.
 * This file owns translating "the account resolved / didn't / the provider
 * is unreachable" into the same PayoutVerificationOutcome vocabulary the
 * pre-existing FORMAT_CHECKS/MANUAL providers already speak, so
 * addPayoutAccount's risk decision never has to know which provider ran.
 *
 * `gateway` is injected (not imported directly) so this file stays free of
 * any @repo/db import — same "pure lib, DI'd side effects" convention as
 * flutterwave.adapter.ts's FakeHttp. The real gateway (backed by Finance's
 * resolveProviderGateway, which does hit the DB) is wired in by
 * lib/payout-verification/index.ts, the one composition point that already
 * decides which provider the payout service gets.
 */

export interface BankResolutionGateway {
  resolveBankAccount(
    countryId: string,
    input: { bankCode: string; accountNumber: string; currency: string },
  ): Promise<NormalizedBankAccount>
}

function checkedAt(): string {
  return new Date().toISOString()
}

/** Translate a gateway failure into an outcome. Never echoes provider text. */
function outcomeForGatewayError(err: unknown, fallback: PayoutVerificationOutcome): PayoutVerificationOutcome {
  if (isProviderError(err)) {
    switch (err.category) {
      case "TRANSACTION_DECLINED":
      case "INVALID_REQUEST":
        // The provider looked the account up and it's not real / doesn't
        // match — a confirmed fact, not a maybe. This is the one case an
        // automatic FAILED (not just REQUIRES_REVIEW) is warranted.
        return {
          status: "FAILED",
          method: "FINANCE_BANK_RESOLUTION",
          reason: "We couldn't verify this bank account with the provider — double-check the bank and account number.",
          meta  : { checkedAt: checkedAt() },
        }
      case "UNSUPPORTED_CAPABILITY":
        // The configured provider for this country can't do bank
        // resolution (or none is configured yet) — not evidence about the
        // account at all. Same behavior as before this provider existed.
        return fallback
      default:
        // AUTHENTICATION / PROVIDER_UNAVAILABLE / TIMEOUT / RATE_LIMIT /
        // UNKNOWN — a transport/config problem on our side, not the
        // vendor's account. Never silently reject or silently verify; a
        // human resolves it.
        return {
          status: "REQUIRES_REVIEW",
          method: "FINANCE_BANK_RESOLUTION",
          reason: "Automatic verification is temporarily unavailable — this account will be reviewed manually.",
          meta  : { checkedAt: checkedAt(), providerErrorCategory: err.category },
        }
    }
  }
  if (err instanceof ApiError) {
    // resolveProviderGateway's own "not configured yet" errors (financial
    // config inactive, no active provider account, capability not enabled,
    // credentials unresolved) — a country simply not set up for this yet.
    // Degrade to the existing offline path rather than failing the vendor.
    return fallback
  }
  throw err // genuinely unexpected — don't hide it behind a false PENDING
}

export function createFinanceBankVerificationProvider(gateway: BankResolutionGateway): PayoutVerificationProvider {
  return {
    name: "FINANCE_BANK_RESOLUTION",

    async verify(input: PayoutVerificationInput): Promise<PayoutVerificationOutcome> {
      // Structural checks always run first — a typo'd IBAN or an
      // implausible phone number never reaches the provider.
      const structural = await formatChecksProvider.verify(input)
      if (structural.status === "FAILED") return structural

      // Only BANK has a resolution capability today (BANK_ACCOUNT_RESOLUTION
      // — see provider.capabilities.ts). Everything else, or a BANK account
      // missing what the lookup needs, falls back to the offline result
      // (PENDING → manual queue), unchanged from before this file existed.
      if (
        input.methodType !== "BANK" ||
        !input.bankCode?.trim() ||
        !input.accountNumber?.trim() ||
        !input.countryId ||
        !input.currency
      ) {
        return structural
      }

      try {
        const resolved = await gateway.resolveBankAccount(input.countryId, {
          bankCode     : input.bankCode.trim(),
          accountNumber: input.accountNumber.trim(),
          currency     : input.currency,
        })
        return {
          status: "VERIFIED",
          method: "FINANCE_BANK_RESOLUTION",
          reason: "Bank account confirmed by the payment provider.",
          meta  : {
            // Safe to keep: a name and a bank label, never the raw
            // account number/bank code (those already live encrypted on
            // the account itself — duplicating them into verificationMeta
            // would be exactly the raw-identifier leak §20 forbids).
            verifiedAccountName: resolved.accountName || null,
            verifiedBankName   : resolved.bankName ?? null,
            checkedAt          : checkedAt(),
          },
        }
      } catch (err) {
        return outcomeForGatewayError(err, structural)
      }
    },
  }
}
