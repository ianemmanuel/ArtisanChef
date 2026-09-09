import "server-only"
import { backendFetch, BackendApiError } from "@/lib/api/server"
import type { Outlet } from "@/types/outlet"

/*
 * Server-side outlet data access — the ONE place vendor outlet endpoints are
 * called from. Pages import these instead of hand-rolling `fetch` with a raw
 * Clerk token (which the outlet pages used to do, bypassing backendFetch and
 * its error handling entirely).
 *
 * Everything is ISR-tagged so a mutation can invalidate precisely
 * (`revalidateTag`) rather than every page guessing a TTL.
 */

export const OUTLETS_TAG = "vendor-outlets"
export const outletTag = (id: string) => `vendor-outlet-${id}`

/*
 * Outlets change on vendor action, not on a clock — a short TTL plus tag
 * invalidation keeps the list fresh without refetching on every navigation.
 *
 * Safe on per-vendor data: Next hashes the fetch headers into the Data Cache
 * key (verified in `IncrementalCache.generateCacheKey`), so one vendor's
 * bearer token can never read another's cached response. The TTL is what
 * bounds the entries a rotating Clerk token would otherwise pile up.
 */
const LIST_REVALIDATE = 60

export interface OutletListParams {
  search?: string
  status?: string
  cityId?: string
  page?  : number
  pageSize?: number
}

export interface OutletListResult {
  outlets : Outlet[]
  total   : number
  page    : number
  pageSize: number
}

export async function getOutlets(params: OutletListParams = {}): Promise<OutletListResult> {
  const qs = new URLSearchParams()
  if (params.search) qs.set("search", params.search)
  if (params.status) qs.set("status", params.status)
  if (params.cityId) qs.set("cityId", params.cityId)
  qs.set("page", String(params.page ?? 1))
  qs.set("pageSize", String(params.pageSize ?? 12))

  return backendFetch<OutletListResult>(`/vendor/v1/outlets?${qs}`, { revalidate: LIST_REVALIDATE, tags: [OUTLETS_TAG] })
}

/** Distinct cities this vendor operates in — powers the list's city filter. */
export async function getOutletCities(): Promise<{ id: string; name: string }[]> {
  return backendFetch<{ id: string; name: string }[]>("/vendor/v1/outlets/cities", { revalidate: LIST_REVALIDATE, tags: [OUTLETS_TAG] })
}

/** One outlet, or null when it doesn't exist / isn't this vendor's. */
export async function getOutlet(id: string): Promise<Outlet | null> {
  try {
    return await backendFetch<Outlet>(`/vendor/v1/outlets/${id}`, { revalidate: LIST_REVALIDATE, tags: [outletTag(id)] })
  } catch (err) {
    // A missing outlet is a normal 404 the page turns into notFound() — not
    // an error worth crashing the render over. Anything else still throws.
    if (err instanceof BackendApiError && err.status === 404) return null
    throw err
  }
}
