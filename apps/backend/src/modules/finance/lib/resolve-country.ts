import { prisma } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/errors/ApiError"
import { UUID_RE } from "@/constants/system"
import { isCountryInFinanceScope } from "./scope"

/**
 * Resolve a country :ref (UUID or slug) to its id, then assert it's in the
 * caller's scope. A country-scoped admin resolving another country's ref
 * gets a 404 (same "a filter cannot widen access" convention as
 * getCountryIdFromSlug elsewhere) rather than a 403 that would confirm the
 * country exists.
 */
export async function resolveCountryIdInScope(ref: string, scope: AdminScopeContext): Promise<string> {
  const country = await prisma.country.findFirst({
    where: UUID_RE.test(ref) ? { id: ref } : { slug: ref },
    select: { id: true },
  })
  if (!country || !isCountryInFinanceScope(scope, country.id)) {
    throw new ApiError(404, "Country not found", "NOT_FOUND")
  }
  return country.id
}
