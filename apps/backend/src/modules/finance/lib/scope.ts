import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/errors/ApiError"

/*
 * Finance authorization guards — thin wrappers over the EXISTING
 * AdminScopeContext (built by buildScopeContext middleware). No new
 * authorization mechanism: `requirePermission` still gates the route,
 * this only adds the scope-tier rule on top, exactly like
 * admin.paymentMethod.service.ts's assertGlobalScope.
 *
 * Platform financial configuration (currencies, provider catalog, and in
 * later phases CountryFinancialConfig / CountryProviderAccount) is
 * GLOBAL-scope-only to mutate — a country-scoped finance admin may READ
 * their own country's view but can never configure platform-wide
 * financial infrastructure.
 */

export function assertGlobalFinanceScope(scope: AdminScopeContext): void {
  if (!scope.isGlobal) {
    throw new ApiError(
      403,
      "Platform financial configuration can only be changed by a globally-scoped admin",
      "FINANCE_SCOPE_FORBIDDEN",
    )
  }
}

/** For scope-filtered reads / future per-country config actions. */
export function isCountryInFinanceScope(scope: AdminScopeContext, countryId: string): boolean {
  return scope.isGlobal || scope.countryIds.includes(countryId)
}

export function assertCountryInFinanceScope(scope: AdminScopeContext, countryId: string): void {
  if (!isCountryInFinanceScope(scope, countryId)) {
    throw new ApiError(403, "This country is outside your scope", "FINANCE_SCOPE_FORBIDDEN")
  }
}

/*
 * Country-level financial configuration (create/edit DRAFT) — a
 * country-scoped finance admin may act on THEIR OWN country. A
 * city-scoped admin must not: buildScopeContext folds a city's country
 * into countryIds (so assertCountryInFinanceScope alone would pass them),
 * but country-level financial infrastructure is never a city-tier
 * concern. In practice no city-capable role holds
 * finance:configuration:manage anyway — this is defence in depth.
 */
export function isCityScoped(scope: AdminScopeContext): boolean {
  return !scope.isGlobal && scope.cityIds.length > 0
}

export function assertCountryFinanceConfigScope(scope: AdminScopeContext, countryId: string): void {
  if (isCityScoped(scope)) {
    throw new ApiError(403, "City-scoped admins cannot manage country financial configuration", "FINANCE_SCOPE_FORBIDDEN")
  }
  assertCountryInFinanceScope(scope, countryId)
}

/*
 * A record addressed by an OPAQUE id (a provider-account id in a path, an
 * account id in a request body) whose owning country the caller is not
 * entitled to see must fail with a 404 that is identical to a genuinely
 * missing row — never a 403/400 that says "wrong country" or "outside your
 * scope", which would let a caller probe an id space and learn that a
 * record exists in a country they can't access.
 *
 * (The 403 "outside your scope" pattern used elsewhere in the admin module
 * is fine for routes addressed by a country :ref — the ref is already
 * resolved in-scope by resolveCountryIdInScope, so a 403 there reveals
 * nothing the caller didn't already supply. It's only opaque ids that leak.)
 */
export function assertFinanceRecordVisibleOr404(
  ownerCountryId: string,
  scope: AdminScopeContext,
  label = "Record",
): void {
  if (isCityScoped(scope) || !isCountryInFinanceScope(scope, ownerCountryId)) {
    throw new ApiError(404, `${label} not found`, "NOT_FOUND")
  }
}
