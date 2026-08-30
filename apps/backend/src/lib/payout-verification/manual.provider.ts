import type { PayoutVerificationProvider, PayoutVerificationOutcome } from "./types"

/*
 * A pure no-op: every account it sees goes to the manual review queue.
 * Kept as a named provider so a deployment can opt out of even the offline
 * structural checks (formatChecksProvider) if it wants a purely human flow.
 */
export const manualProvider: PayoutVerificationProvider = {
  name: "MANUAL",

  async verify(): Promise<PayoutVerificationOutcome> {
    return {
      status: "REQUIRES_REVIEW",
      method: "MANUAL",
      reason: "Awaiting manual verification by an admin.",
    }
  },
}
