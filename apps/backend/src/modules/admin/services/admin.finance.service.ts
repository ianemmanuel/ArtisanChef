import { prisma, OutletAdminStatus, GeoStatus } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { getCountryIdFromSlug } from "../helpers/get-country-id.helper"
import { buildVendorScopeFilter } from "./admin.vendor.service"

/*
 * Read-only, lightweight lookups for the Finance domain (/finance/*) —
 * deliberately a separate service file, not a reuse of admin.outlet.
 * service.ts / admin.city.service.ts, because those are gated on
 * VENDORS_OUTLETS_READ / SETTINGS_GEOGRAPHY_READ respectively, permissions
 * a pure `finance`-role admin doesn't hold (confirmed: finance's pool has
 * neither). A finance admin needs to see which outlets/cities exist for
 * revenue ranking purposes without gaining outlet-moderation or geography-
 * config access — this file's two functions are gated on FINANCE_REPORTS_
 * READ only, and expose the absolute minimum (id/name/city), nothing an
 * outlet-moderation or geography page would show.
 */

export interface FinanceOutletLite {
  id       : string
  name     : string
  vendorId : string
  vendorName: string
  cityId   : string
  cityName : string
  countryId: string
}

export async function listOutletsForFinance(
  scope : AdminScopeContext,
  params: { countrySlug?: string; cityId?: string; page?: number; pageSize?: number } = {},
): Promise<{ outlets: FinanceOutletLite[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const { cityId, page = 1, pageSize = 20 } = params
  const skip = (page - 1) * pageSize
  const countryId = params.countrySlug ? await getCountryIdFromSlug(params.countrySlug, scope) : undefined

  const where = {
    deletedAt  : null,
    adminStatus: OutletAdminStatus.ACTIVE,
    ...(cityId ? { cityId } : {}),
    vendor: { ...buildVendorScopeFilter(scope, countryId), deletedAt: null },
  }

  const [rows, total] = await Promise.all([
    prisma.outlet.findMany({
      where,
      skip, take: pageSize,
      orderBy: { createdAt: "desc" },
      select : { id: true, name: true, cityId: true, vendorId: true, vendor: { select: { id: true, legalBusinessName: true, countryId: true } } },
    }),
    prisma.outlet.count({ where }),
  ])

  const cityIds = [...new Set(rows.map((r) => r.cityId))]
  const cities = cityIds.length
    ? await prisma.city.findMany({ where: { id: { in: cityIds } }, select: { id: true, name: true } })
    : []
  const cityById = new Map(cities.map((c) => [c.id, c.name]))

  return {
    outlets: rows.map((r) => ({
      id: r.id, name: r.name, vendorId: r.vendorId, vendorName: r.vendor.legalBusinessName,
      cityId: r.cityId, cityName: cityById.get(r.cityId) ?? "—", countryId: r.vendor.countryId,
    })),
    total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export interface FinanceCityLite { id: string; name: string; slug: string; outletCount: number }

/*
 * outletCount rides along so the frontend's mock revenue figure can scale
 * off a real signal (see lib/mock/city-revenue.ts) instead of being pure
 * hash noise — same technique as getCityOutletLeaderboard in
 * admin.country.service.ts, just re-implemented here rather than reused
 * (that one is gated on SETTINGS_GEOGRAPHY_READ, which a finance-role
 * admin doesn't hold).
 */
export async function listCitiesForFinance(scope: AdminScopeContext, countrySlug: string): Promise<FinanceCityLite[]> {
  const countryId = await getCountryIdFromSlug(countrySlug, scope)
  const cityScopeFilter = scope.cityIds.length > 0 ? { id: { in: scope.cityIds } } : {}

  const cities = await prisma.city.findMany({
    where  : { countryId, ...cityScopeFilter, status: GeoStatus.ACTIVE },
    select : { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  })
  if (cities.length === 0) return []

  const groups = await prisma.outlet.groupBy({
    by    : ["cityId"],
    where : { cityId: { in: cities.map((c) => c.id) }, deletedAt: null, adminStatus: OutletAdminStatus.ACTIVE },
    _count: true,
  })
  const countByCity = new Map(groups.map((g) => [g.cityId, g._count]))

  return cities.map((c) => ({ ...c, outletCount: countByCity.get(c.id) ?? 0 }))
}
