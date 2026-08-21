import type { AdminSessionData } from "@repo/types/admin-app"

/**
 * Scope tier — coarser than the raw scope rows, used for page/nav gating.
 * GLOBAL   → sees everything (super_admin, or any globally-scoped role).
 * COUNTRY  → sees only their assigned country/countries.
 * CITY     → sees only their assigned city/cities — no country-level
 *            rollups, so /countries is off-limits entirely, not just
 *            filtered.
 */
export type ScopeTier = "GLOBAL" | "COUNTRY" | "CITY"

export function getScopeTier(session: AdminSessionData): ScopeTier {
  const rows = session.scope.scopes ?? []
  if (session.scope.isGlobal || rows.some((s) => s.scopeType === "GLOBAL")) return "GLOBAL"
  if (rows.some((s) => s.scopeType === "COUNTRY")) return "COUNTRY"
  return "CITY"
}
