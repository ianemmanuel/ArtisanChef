import { prisma } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/errors/ApiError"
import { UUID_RE } from "@/constants/system"

/*
 * resolveCountryIdInScope — the ONE implementation shared by the admin and
 * finance modules for turning a country reference (a UUID or a slug, taken
 * from a route param or a filter value) into a country id, constrained to
 * the caller's admin scope.
 *
 * A reference that doesn't resolve *within the caller's scope* fails with a
 * 404 that is byte-for-byte identical to a genuinely unknown country — so a
 * path param or filter value can never confirm that a country exists
 * outside the caller's scope ("a filter cannot widen access", and it can't
 * be used to probe existence either).
 *
 * Fail-closed: a non-global admin with no country scope rows resolves
 * nothing (rather than the old helper's "no rows => no filter => any
 * country" behaviour).
 *
 * Previously duplicated as admin `getCountryIdFromSlug` (slug-only) and
 * finance `resolveCountryIdInScope` (uuid-or-slug); both now delegate here.
 */
export async function resolveCountryIdInScope(
  ref: string,
  scope: AdminScopeContext,
  errorCode = "COUNTRY_NOT_FOUND",
): Promise<string> {
  const match = UUID_RE.test(ref) ? { id: ref } : { slug: ref }

  const country = await prisma.country.findFirst({
    where: scope.isGlobal ? match : { AND: [match, { id: { in: scope.countryIds } }] },
    select: { id: true },
  })

  if (!country) {
    throw new ApiError(404, "Country not found", errorCode)
  }
  return country.id
}
