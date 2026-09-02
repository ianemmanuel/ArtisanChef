import { describe, it, expect } from "vitest"
import type { AdminScopeContext } from "@repo/types/backend"
import {
  assertGlobalFinanceScope,
  assertCountryInFinanceScope,
  isCountryInFinanceScope,
  assertCountryFinanceConfigScope,
  isCityScoped,
} from "./scope"
import { ApiError } from "@/errors/ApiError"

const globalScope: AdminScopeContext = { isGlobal: true, countryIds: [], cityIds: [] }
const kenyaScope: AdminScopeContext = { isGlobal: false, countryIds: ["ke-id"], cityIds: [] }
// buildScopeContext folds a city's country into countryIds for a city-scoped admin
const nairobiCityScope: AdminScopeContext = { isGlobal: false, countryIds: ["ke-id"], cityIds: ["nairobi-id"] }

describe("finance scope guards", () => {
  it("assertGlobalFinanceScope allows a global admin", () => {
    expect(() => assertGlobalFinanceScope(globalScope)).not.toThrow()
  })

  it("assertGlobalFinanceScope blocks a country-scoped admin (403 FINANCE_SCOPE_FORBIDDEN)", () => {
    try {
      assertGlobalFinanceScope(kenyaScope)
      throw new Error("expected to throw")
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).statusCode).toBe(403)
      expect((err as ApiError).code).toBe("FINANCE_SCOPE_FORBIDDEN")
    }
  })

  it("country scoping: global sees every country, country-scoped sees only its own", () => {
    expect(isCountryInFinanceScope(globalScope, "any-country")).toBe(true)
    expect(isCountryInFinanceScope(kenyaScope, "ke-id")).toBe(true)
    expect(isCountryInFinanceScope(kenyaScope, "ug-id")).toBe(false)
    expect(() => assertCountryInFinanceScope(kenyaScope, "ug-id")).toThrow(ApiError)
    expect(() => assertCountryInFinanceScope(kenyaScope, "ke-id")).not.toThrow()
  })

  it("country-config scope: a country-scoped admin may act on their own country", () => {
    expect(() => assertCountryFinanceConfigScope(globalScope, "any")).not.toThrow()
    expect(() => assertCountryFinanceConfigScope(kenyaScope, "ke-id")).not.toThrow()
    expect(() => assertCountryFinanceConfigScope(kenyaScope, "ug-id")).toThrow(ApiError)
  })

  it("country-config scope: a CITY-scoped admin is refused even for their own country", () => {
    expect(isCityScoped(nairobiCityScope)).toBe(true)
    expect(isCityScoped(kenyaScope)).toBe(false)
    expect(isCityScoped(globalScope)).toBe(false)
    // assertCountryInFinanceScope alone would let them through (ke-id is in countryIds)…
    expect(() => assertCountryInFinanceScope(nairobiCityScope, "ke-id")).not.toThrow()
    // …but country financial infrastructure is never a city-tier concern:
    const err = (() => { try { assertCountryFinanceConfigScope(nairobiCityScope, "ke-id"); return null } catch (e) { return e as ApiError } })()
    expect(err).toBeInstanceOf(ApiError)
    expect(err!.statusCode).toBe(403)
  })
})
