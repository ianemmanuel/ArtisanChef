/*
 * Provider registry — the single choke point that maps a provider code to
 * its adapter, and the ONLY place the rest of the finance domain resolves
 * "which implementation do I call". Replaces every `if (country === "KE")`
 * / `if (provider === "flutterwave")` that would otherwise sprawl.
 *
 * Phase 1A: intentionally EMPTY. No adapters are registered because no
 * integration exists yet. The shape is here so later phases only add
 * `register(new FlutterwaveAdapter())` and wire the country→provider
 * resolution — nothing structural changes.
 */

import { ApiError } from "@/errors/ApiError"
import type { PaymentProviderAdapter } from "./provider.types"
import type { ProviderCapability } from "./provider.capabilities"

const adapters = new Map<string, PaymentProviderAdapter>()

export function registerProviderAdapter(adapter: PaymentProviderAdapter): void {
  adapters.set(adapter.code.toUpperCase(), adapter)
}

export function hasProviderAdapter(code: string): boolean {
  return adapters.has(code.toUpperCase())
}

export function getProviderAdapter(code: string): PaymentProviderAdapter {
  const adapter = adapters.get(code.toUpperCase())
  if (!adapter) {
    throw new ApiError(
      501,
      `No payment-provider adapter is registered for "${code}". Provider integrations are not implemented yet.`,
      "PROVIDER_ADAPTER_NOT_IMPLEMENTED",
    )
  }
  return adapter
}

export function assertAdapterCapability(code: string, capability: ProviderCapability): void {
  const adapter = getProviderAdapter(code)
  if (!adapter.capabilities.has(capability)) {
    throw new ApiError(
      422,
      `Provider "${code}" does not support the "${capability}" capability`,
      "PROVIDER_CAPABILITY_UNSUPPORTED",
    )
  }
}

/** Test/bootstrap helper — clears all registrations. */
export function _resetProviderRegistry(): void {
  adapters.clear()
}
