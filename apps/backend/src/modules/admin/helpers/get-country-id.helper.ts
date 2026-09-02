import type { AdminScopeContext } from "@repo/types/backend"
import { resolveCountryIdInScope } from "@/modules/admin/lib/scope/resolve-country-id"

/**
 * @deprecated Use {@link resolveCountryIdInScope} directly — it accepts a
 * UUID *or* a slug and is the shared implementation across the admin and
 * finance modules. Kept as a thin, slug-taking alias so existing callers
 * don't have to change; new code should call `resolveCountryIdInScope`.
 */
export function getCountryIdFromSlug(
  countrySlug: string,
  adminScope: AdminScopeContext,
): Promise<string> {
  return resolveCountryIdInScope(countrySlug, adminScope)
}
