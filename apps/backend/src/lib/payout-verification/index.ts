import type { PayoutVerificationProvider } from "./types"
import { formatChecksProvider } from "./format-checks.provider"
import { manualProvider } from "./manual.provider"

export * from "./types"
export * from "./checksums"
export { bestNameMatch } from "./name-match"

/*
 * The one place the payout service resolves a verification provider. Swap
 * the return value (or make it env-driven) when a real provider is wired
 * up — nothing else in the payout flow needs to change.
 */
export function getPayoutVerificationProvider(): PayoutVerificationProvider {
  return formatChecksProvider
}

export { formatChecksProvider, manualProvider }
