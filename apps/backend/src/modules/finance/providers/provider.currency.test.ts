import { describe, it, expect } from "vitest"
import { resolveProviderCurrency } from "./provider.currency"

describe("resolveProviderCurrency", () => {
  it("normalises the ISO code (trim + uppercase) and passes it through", () => {
    const r = resolveProviderCurrency(" kes ", { code: "FLUTTERWAVE", supportedCurrencies: ["KES", "NGN"] })
    expect(r.iso).toBe("KES")
    expect(r.providerRepresentation).toBe("KES")
    expect(r.supported).toBe(true)
  })

  it("marks a currency the provider's catalog does not list as unsupported", () => {
    const r = resolveProviderCurrency("EUR", { code: "FLUTTERWAVE", supportedCurrencies: ["KES", "NGN"] })
    expect(r.supported).toBe(false)
  })

  it("treats an empty supportedCurrencies list as unrestricted", () => {
    const r = resolveProviderCurrency("EUR", { code: "SOMEPROVIDER", supportedCurrencies: [] })
    expect(r.supported).toBe(true)
  })
})
