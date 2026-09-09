/*
 * The one place concrete provider adapters are registered into the registry.
 * Called once at boot (bootstrap/externalServices.ts). Adding a provider is
 * a single line here — nothing else in the finance domain changes, and no
 * `if (provider === "X")` appears anywhere outside this integration boundary.
 *
 * Stripe stays a future provider: no adapter, no registration, until its
 * own phase.
 */

import { logger } from "@/lib/pino/logger"
import { registerProviderAdapter, _resetProviderRegistry } from "./provider.registry"
import { createFlutterwaveAdapter } from "./flutterwave"
import { createDlocalAdapter } from "./dlocal"

let registered = false

export function registerProviderAdapters(): void {
  if (registered) return
  registerProviderAdapter(createFlutterwaveAdapter())
  // dLocal — bank-account resolution only (dLocal's account-validation
  // endpoint); its collection/payout rails are separate future phases.
  registerProviderAdapter(createDlocalAdapter())
  registered = true
  logger.info({ providers: ["FLUTTERWAVE", "DLOCAL"] }, "Payment-provider adapters registered")
}

/** Test helper — clears the registry and the once-guard. */
export function _resetRegisteredAdapters(): void {
  _resetProviderRegistry()
  registered = false
}
