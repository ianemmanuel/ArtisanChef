
import type { AdminScopeContext } from "@repo/types/backend"
import type { CountrySummaryResult, CountryListResult, CountryVendorSnapshot, CountryOnboardingLeaderboardEntry } from "@repo/types/backend"
import type { CityOutletLeaderboardEntry } from "@repo/types/backend"
import { getCountryIdFromSlug } from "../helpers/get-country-id.helper"
import { prisma, GeoStatus } from "@repo/db"
import { ApiError } from "@/middleware/error"
import { UUID_RE } from "@/constants/system"
import { auditService } from "@/services/audit"
import { logger } from "@/lib/pino/logger"
import { buildCountrySlug } from "@/utils/geo-slug.utils"


const serviceLog = logger.child({ module: "admin-country-service" })

async function resolveCountryId(idOrSlug: string): Promise<string> {
  const isUuid = UUID_RE.test(idOrSlug)
  const country = await prisma.country.findFirst({
    where : isUuid ? { id: idOrSlug } : { slug: idOrSlug },
    select: { id: true },
  })
  if (!country) throw new ApiError(404, "Country not found", "NOT_FOUND")
  return country.id
}

function assertCountryInScope(countryId: string, scope: AdminScopeContext): void {
  if (!scope.isGlobal && !scope.countryIds.includes(countryId)) {
    throw new ApiError(403, "This country is outside your scope", "SCOPE_FORBIDDEN")
  }
}

export async function getCountriesByStatus(
  scope:   AdminScopeContext,
  status?: "ACTIVE" | "INACTIVE",
  params: { page?: number; pageSize?: number; search?: string } = {},
): Promise<CountryListResult> {
  const { page = 1, pageSize = 10, search } = params
  const skip = (page - 1) * pageSize

  const statusFilter = status ? { status } : {}
  const searchFilter = search ? { name: { contains: search, mode: "insensitive" as const } } : {}
  const scopeFilter  = scope.isGlobal
    ? { ...statusFilter, ...searchFilter }
    : { ...statusFilter, ...searchFilter, id: { in: scope.countryIds } }

  const [countries, total] = await Promise.all([
    prisma.country.findMany({
      where  : scopeFilter,
      skip,
      take   : pageSize,
      orderBy: { name: "asc" },
      select : {
        id       : true,
        name     : true,
        slug     : true,
        code     : true,
        currency : true,
        phoneCode: true,
        status   : true,
        createdAt: true,
        region: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { cities: true, vendors: true },
        },
      },
    }) as Promise<CountrySummaryResult[]>,
    prisma.country.count({ where: scopeFilter }),
  ])

  return { countries, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getCountry(
    idOrSlug: string, 
    scope: AdminScopeContext
) {
  const countryId = await resolveCountryId(idOrSlug)
  assertCountryInScope(countryId, scope)

  // Same city-scope narrowing as listCitiesForCountry — a city-scoped
  // admin's countryIds includes this country incidentally (from
  // buildScopeContext), but they should only see their own city/cities.
  const cityScopeFilter = scope.cityIds.length > 0 ? { id: { in: scope.cityIds } } : {}

  const country = await prisma.country.findUnique({
    where  : { id: countryId },
    include: {
      cities: {
        where  : cityScopeFilter,
        orderBy: { name: "asc" },
        select : {
          id            : true,
          name          : true,
          slug          : true,
          code          : true,
          timezone      : true,
          status        : true,
          latitude      : true,
          longitude     : true,
          osmId         : true,
          boundarySource: true,
          boundarySetAt : true,
          boundingBox   : true,
          _count        : { select: { serviceAreas: true, deliveryZones: true } },
        },
      },
    },
  })

  if (!country) throw new ApiError(404, "Country not found", "NOT_FOUND")
  return country
}

export async function activateCountry(
    idOrSlug: string,
    actorId  : string,
    scope    : AdminScopeContext,
) {
    if (!scope.isGlobal) {
        throw new ApiError(403, "Operation beyond your current scope", "SCOPE_FORBIDDEN")
    }

    const countryId = await resolveCountryId(idOrSlug)
    const country = await prisma.country.findUnique({ where: { id: countryId } })
    if (!country) throw new ApiError(404, "Country not found", "NOT_FOUND")
    if (country.status === GeoStatus.ACTIVE) {
        throw new ApiError(400, "Country is already active", "ALREADY_ACTIVE")
    }

    await prisma.country.update({ where: { id: countryId }, data: { status: GeoStatus.ACTIVE } })

    serviceLog.info({ countryId, actorId }, "Country activated")
    auditService.log({
        adminUserId: actorId,
        action     : "country.activated",
        entityType : "Country",
        entityId   : countryId,
        changes    : { before: { status: GeoStatus.INACTIVE }, after: { status: GeoStatus.ACTIVE } },
    })

    return { success: true }
}

export async function deactivateCountry(
    idOrSlug: string,
    actorId  : string,
    scope    : AdminScopeContext,
) {
    if (!scope.isGlobal) {
        throw new ApiError(403, "Operation beyond your current scope", "SCOPE_FORBIDDEN")
    }

    const countryId = await resolveCountryId(idOrSlug)
    const country = await prisma.country.findUnique({ where: { id: countryId } })
    if (!country) throw new ApiError(404, "Country not found", "NOT_FOUND")
    if (country.status === GeoStatus.INACTIVE) {
      throw new ApiError(400, "Country is already inactive", "ALREADY_INACTIVE")
    }

    const activeVendorCount = await prisma.vendorAccount.count({
      where: { countryId, status: "ACTIVE", deletedAt: null },
    })

    await prisma.country.update({ where: { id: countryId }, data: { status: GeoStatus.INACTIVE } })

    serviceLog.warn({ countryId, actorId, activeVendorCount }, "Country deactivated")
    auditService.log({
      adminUserId: actorId,
      action     : "country.deactivated",
      entityType : "Country",
      entityId   : countryId,
      changes    : { before: { status: GeoStatus.ACTIVE }, after: { status: GeoStatus.INACTIVE } },
      metadata   : { activeVendorCount },
    })

    return { success: true, activeVendorCount }
}

//*REGIONS
export async function assignCountryToRegion( 
  idOrSlug  : string, 
  regionId  : string, 
  adminId   : string, 
  scope     : AdminScopeContext,
) {

  if (!scope.isGlobal) {
    throw new ApiError(403, "Operation beyond your current scope", "SCOPE_FORBIDDEN")
  }

  const countryId = await resolveCountryId(idOrSlug)

  await prisma.country.update({
    where: { id: countryId },
    data:  { regionId },
  })

  serviceLog.info({ countryId: countryId, adminId }, "Country updated")
  auditService.log({
    adminUserId: adminId,
    action     : "country.updated",
    entityType : "Country",
    entityId   :  countryId,
    changes    : { after: { regionId } },
  })

  return { success: true }
}

export async function removeCountryFromRegion( 
  idOrSlug  : string,  
  adminId   : string, 
  scope     : AdminScopeContext,
) {

  if (!scope.isGlobal) {
    throw new ApiError(403, "Operation beyond your current scope", "SCOPE_FORBIDDEN")
  }

  const countryId = await resolveCountryId(idOrSlug)

  await prisma.country.update({
    where: { id: countryId },
    data:  { regionId: null },
  })

  serviceLog.info({ countryId: countryId, adminId }, "Country updated")
  auditService.log({
    adminUserId: adminId,
    action     : "country.updated",
    entityType : "Country",
    entityId   :  countryId,
    changes    : { after: { regionId: null } },
  })

  return { success: true }
}


export async function listCountriesForScope(
    actorCountryIds: string[],
    isGlobal       : boolean,
){
    const select = {
        id : true,
        name : true,
        slug : true,
        code : true,
        currency : true,
        currencySymbol: true,
        phoneCode : true,
        timezones : true,
        status : true,
        createdAt : true,
    }

    if (isGlobal) {
        return prisma.country.findMany({
            orderBy: { name: "asc" },
            select : { ...select, _count: { select: { cities: true, vendors: true } } },
        })
    }

    return prisma.country.findMany({
        where  : { id: { in: actorCountryIds }, status: "ACTIVE" },
        orderBy: { name: "asc" },
        select : { ...select, _count: { select: { cities: true } } },
    })
}

export async function listCitiesForCountry(
  idOrSlug: string,
  scope: AdminScopeContext,
  params: { page?: number; pageSize?: number; status?: "ACTIVE" | "INACTIVE"; search?: string } = {},
){
  const countryId = await resolveCountryId(idOrSlug)
  assertCountryInScope(countryId, scope)

  // A city-scoped admin's countryIds includes the country their city sits
  // in (so assertCountryInScope above passes), but that doesn't mean they
  // should see every city in the country — only the one(s) they're
  // actually scoped to. Country/global admins have an empty cityIds and
  // are unaffected by this filter.
  const cityScopeFilter = scope.cityIds.length > 0 ? { id: { in: scope.cityIds } } : {}

  const { page = 1, pageSize = 10, status, search } = params
  const skip  = (page - 1) * pageSize
  const where = {
    countryId,
    ...cityScopeFilter,
    ...(status ? { status } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  }

  const [cities, total] = await Promise.all([
    prisma.city.findMany({
      where,
      skip,
      take   : pageSize,
      orderBy: { name: "asc" },
      select : {
        id            : true,
        name          : true,
        slug          : true,
        code          : true,
        timezone      : true,
        countryId     : true,
        status        : true,
        latitude      : true,
        longitude     : true,
        osmId         : true,
        boundarySource: true,
        boundarySetAt : true,
        boundingBox   : true,
        createdAt     : true,
        _count        : { select: { serviceAreas: true, deliveryZones: true } },
      },
    }),
    prisma.city.count({ where }),
  ])

  return { cities, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

/**
 * Ranks active cities within a country by outlet count (outlets, not
 * vendor accounts — see the comment on CityOutletSnapshot for why).
 * Same "return everything ranked, let the frontend slice" contract as
 * getVendorOnboardingLeaderboard.
 */
export async function getCityOutletLeaderboard(
  idOrSlug: string,
  scope: AdminScopeContext,
): Promise<CityOutletLeaderboardEntry[]> {
  const countryId = await resolveCountryId(idOrSlug)
  assertCountryInScope(countryId, scope)

  const cityScopeFilter = scope.cityIds.length > 0 ? { id: { in: scope.cityIds } } : {}

  const cities = await prisma.city.findMany({
    where : { countryId, ...cityScopeFilter, status: GeoStatus.ACTIVE },
    select: { id: true, name: true, slug: true },
  })
  if (cities.length === 0) return []

  const groups = await prisma.outlet.groupBy({
    by    : ["cityId"],
    where : { cityId: { in: cities.map((c) => c.id) }, deletedAt: null },
    _count: true,
  })
  const countByCity = new Map(groups.map((g) => [g.cityId, g._count]))

  return cities
    .map((c) => ({ cityId: c.id, name: c.name, slug: c.slug, count: countByCity.get(c.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
}

export async function getCountryVendorSnapshot(
  countrySlug: string,
  adminScope:  AdminScopeContext,
): Promise<CountryVendorSnapshot> {
  const countryId = await getCountryIdFromSlug(countrySlug, adminScope)

  const [applicationGroups, accountGroups, vendorTypeGroups] = await Promise.all([
    prisma.vendorApplication.groupBy({
      by    : ["status"],
      where : { countryId },
      _count: true,
    }),
    prisma.vendorAccount.groupBy({
      by    : ["status"],
      where : { countryId, deletedAt: null },
      _count: true,
    }),
    prisma.vendorAccount.groupBy({
      by    : ["vendorTypeId"],
      where : { countryId, deletedAt: null },
      _count: true,
    }),
  ])

  // Resolve vendor type names in a single query
  const typeMap = new Map(
    (
      await prisma.vendorType.findMany({
        where : { id: { in: vendorTypeGroups.map((v) => v.vendorTypeId) } },
        select: { id: true, name: true },
      })
    ).map((t) => [t.id, t.name]),
  )

  // Helper: find count for a given status string in a groupBy result
  const findCount = <T extends { status: string; _count: number }>(
    rows: T[],
    status: string,
  ): number => rows.find((r) => r.status === status)?._count ?? 0

  const appTotal = applicationGroups.reduce((s, r) => s + r._count, 0)
  const accTotal = accountGroups.reduce((s, r) => s + r._count, 0)

  return {
    applications: {
      total:       appTotal,
      draft:       findCount(applicationGroups, "DRAFT"),
      submitted:   findCount(applicationGroups, "SUBMITTED"),
      underReview: findCount(applicationGroups, "UNDER_REVIEW"),
      approved:    findCount(applicationGroups, "APPROVED"),
      rejected:    findCount(applicationGroups, "REJECTED"),
    },
    accounts: {
      total:     accTotal,
      active:    findCount(accountGroups, "ACTIVE"),
      suspended: findCount(accountGroups, "SUSPENDED"),
      banned:    findCount(accountGroups, "BANNED"),
    },
    vendorTypes: vendorTypeGroups.map((v) => ({
      name : typeMap.get(v.vendorTypeId) ?? "Unknown",
      count: v._count,
    })),
  }
}

function getQuarterRange(which: "current" | "previous"): { start: Date; end: Date } {
  const now = new Date()
  const quarterStartMonth = Math.floor(now.getUTCMonth() / 3) * 3

  const currentStart = new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth, 1))
  const currentEnd   = new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth + 3, 1))

  if (which === "current") return { start: currentStart, end: currentEnd }

  const previousStart = new Date(Date.UTC(currentStart.getUTCFullYear(), currentStart.getUTCMonth() - 3, 1))
  return { start: previousStart, end: currentStart }
}

/**
 * Ranks active countries within scope by vendor applications submitted in
 * the given quarter. Always returns every in-scope active country (ranked
 * highest-first, zero-count countries included) — the frontend decides
 * whether to slice to a top-5 or display the full (short) list.
 */
export async function getVendorOnboardingLeaderboard(
  scope:   AdminScopeContext,
  quarter: "current" | "previous" = "current",
): Promise<CountryOnboardingLeaderboardEntry[]> {
  const { start, end } = getQuarterRange(quarter)
  const scopeFilter = scope.isGlobal ? {} : { id: { in: scope.countryIds } }

  const countries = await prisma.country.findMany({
    where : { ...scopeFilter, status: GeoStatus.ACTIVE },
    select: { id: true, name: true, slug: true },
  })
  if (countries.length === 0) return []

  const groups = await prisma.vendorApplication.groupBy({
    by    : ["countryId"],
    where : { countryId: { in: countries.map((c) => c.id) }, submittedAt: { gte: start, lt: end } },
    _count: true,
  })
  const countByCountry = new Map(groups.map((g) => [g.countryId, g._count]))

  return countries
    .map((c) => ({ countryId: c.id, name: c.name, slug: c.slug, count: countByCountry.get(c.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
}

