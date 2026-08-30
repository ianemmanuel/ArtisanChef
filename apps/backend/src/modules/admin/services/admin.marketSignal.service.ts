import { prisma, MarketSignalStatus, type MarketSignalType } from "@repo/db"
import { ApiError } from "@/middleware/error"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"
import { UUID_RE } from "@/constants/system"
import { resolveCapabilitiesForPoint } from "@/modules/vendor/services/vendor.geography.service"
import type {
  AdminScopeContext,
  CityMarketSignalSummary,
  CreateMarketSignalRequest,
  MarketSignalListResult,
  MarketSignalStatus as MarketSignalStatusT,
} from "@repo/types/backend"

const serviceLog = logger.child({ module: "admin-market-signal-service" })

const VALID_TYPES: MarketSignalType[] = ["VENDOR_INTEREST", "CUSTOMER_INTEREST"]
const VALID_STATUSES: MarketSignalStatusT[] = ["OPEN", "ACTIONED", "DISMISSED"]

// ─── scope (CITY-granular, same rule as zones) ────────────────────────────────

function assertCityInScope(city: { id: string; countryId: string }, scope: AdminScopeContext): void {
  if (scope.isGlobal) return
  if (scope.cityIds.length > 0) {
    if (!scope.cityIds.includes(city.id)) {
      throw new ApiError(403, "This city is outside your scope", "SCOPE_FORBIDDEN")
    }
    return
  }
  if (!scope.countryIds.includes(city.countryId)) {
    throw new ApiError(403, "This city is outside your scope", "SCOPE_FORBIDDEN")
  }
}

async function resolveCity(idOrSlug: string) {
  const isUuid = UUID_RE.test(idOrSlug)
  const city = await prisma.city.findFirst({
    where : isUuid ? { id: idOrSlug } : { slug: idOrSlug },
    select: { id: true, countryId: true },
  })
  if (!city) throw new ApiError(404, "City not found", "NOT_FOUND")
  return city
}

const emptyBucket = () => ({ vendorInterest: 0, customerInterest: 0 })

// ─── reads ───────────────────────────────────────────────────────────────────

export async function getCityMarketSignalSummary(
  cityIdOrSlug: string,
  scope       : AdminScopeContext,
): Promise<CityMarketSignalSummary> {
  const city = await resolveCity(cityIdOrSlug)
  assertCityInScope(city, scope)

  const [zones, byZoneType, byUnzoned, byStatus] = await Promise.all([
    prisma.zone.findMany({
      where : { cityId: city.id, status: "ACTIVE" },
      select: { id: true, name: true, level: true, operationalStatus: true },
      orderBy: [{ level: "desc" }, { name: "asc" }],
    }),
    prisma.marketSignal.groupBy({
      by    : ["zoneId", "type"],
      where : { cityId: city.id, status: MarketSignalStatus.OPEN, zoneId: { not: null } },
      _count: true,
    }),
    prisma.marketSignal.groupBy({
      by    : ["type", "withinCityBoundary"],
      where : { cityId: city.id, status: MarketSignalStatus.OPEN, zoneId: null },
      _count: true,
    }),
    prisma.marketSignal.groupBy({
      by    : ["status"],
      where : { cityId: city.id },
      _count: true,
    }),
  ])

  const zoneBucket = new Map<string, ReturnType<typeof emptyBucket>>()
  for (const z of zones) zoneBucket.set(z.id, emptyBucket())
  for (const row of byZoneType) {
    if (!row.zoneId) continue
    const b = zoneBucket.get(row.zoneId)
    if (!b) continue // signal on a now-inactive zone — folded away
    if (row.type === "VENDOR_INTEREST") b.vendorInterest += row._count
    else b.customerInterest += row._count
  }

  const unzonedInsideBoundary = emptyBucket()
  const outsideBoundary = emptyBucket()
  for (const row of byUnzoned) {
    const target = row.withinCityBoundary ? unzonedInsideBoundary : outsideBoundary
    if (row.type === "VENDOR_INTEREST") target.vendorInterest += row._count
    else target.customerInterest += row._count
  }

  const statusCount = (s: MarketSignalStatus) => byStatus.find((r) => r.status === s)?._count ?? 0
  const totalOfType = (t: MarketSignalType) => sumType(byZoneType, t) + sumType(byUnzoned, t)

  return {
    cityId: city.id,
    totals: {
      vendorInterest  : totalOfType("VENDOR_INTEREST"),
      customerInterest: totalOfType("CUSTOMER_INTEREST"),
      open            : statusCount(MarketSignalStatus.OPEN),
      actioned        : statusCount(MarketSignalStatus.ACTIONED),
      dismissed       : statusCount(MarketSignalStatus.DISMISSED),
    },
    byZone: zones.map((z) => ({
      zoneId          : z.id,
      zoneName        : z.name,
      level           : z.level,
      operationalStatus: z.operationalStatus,
      ...(zoneBucket.get(z.id) ?? emptyBucket()),
    })),
    unzonedInsideBoundary,
    outsideBoundary,
  }
}

function sumType(rows: Array<{ type: MarketSignalType; _count: number }>, t: MarketSignalType): number {
  return rows.filter((r) => r.type === t).reduce((n, r) => n + r._count, 0)
}

export async function listCityMarketSignals(
  cityIdOrSlug: string,
  params      : { type?: string; status?: string; zoneId?: string; page?: number; pageSize?: number },
  scope       : AdminScopeContext,
): Promise<MarketSignalListResult> {
  const city = await resolveCity(cityIdOrSlug)
  assertCityInScope(city, scope)

  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25))

  const where = {
    cityId: city.id,
    ...(params.type && VALID_TYPES.includes(params.type as MarketSignalType) ? { type: params.type as MarketSignalType } : {}),
    ...(params.status && VALID_STATUSES.includes(params.status as MarketSignalStatusT) ? { status: params.status as MarketSignalStatus } : {}),
    ...(params.zoneId ? { zoneId: params.zoneId } : {}),
  }

  const [total, rows] = await Promise.all([
    prisma.marketSignal.count({ where }),
    prisma.marketSignal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip   : (page - 1) * pageSize,
      take   : pageSize,
      include: { zone: { select: { name: true } } },
    }),
  ])

  return {
    signals: rows.map((r) => ({
      id                : r.id,
      type              : r.type,
      cityId            : r.cityId,
      zoneId            : r.zoneId,
      zoneName          : r.zone?.name ?? null,
      latitude          : r.latitude,
      longitude         : r.longitude,
      withinCityBoundary: r.withinCityBoundary,
      vendorAccountId   : r.vendorAccountId,
      contactName       : r.contactName,
      contactEmail      : r.contactEmail,
      contactPhone      : r.contactPhone,
      note              : r.note,
      source            : r.source,
      status            : r.status,
      reviewedByAdminId : r.reviewedByAdminId,
      reviewedAt        : r.reviewedAt?.toISOString() ?? null,
      createdAt         : r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

// ─── mutations ───────────────────────────────────────────────────────────────

export async function recordMarketSignal(
  cityIdOrSlug: string,
  input       : CreateMarketSignalRequest,
  actorId     : string,
  scope       : AdminScopeContext,
) {
  const city = await resolveCity(cityIdOrSlug)
  assertCityInScope(city, scope)

  if (!VALID_TYPES.includes(input.type)) {
    throw new ApiError(400, `type must be one of: ${VALID_TYPES.join(", ")}`, "INVALID_TYPE")
  }
  if (typeof input.latitude !== "number" || typeof input.longitude !== "number") {
    throw new ApiError(400, "latitude and longitude are required", "MISSING_FIELDS")
  }

  const placement = await resolveCapabilitiesForPoint(city.id, {
    latitude: input.latitude, longitude: input.longitude,
  })

  const signal = await prisma.marketSignal.create({
    data: {
      type              : input.type,
      cityId            : city.id,
      zoneId            : placement?.zoneId ?? null,
      latitude          : input.latitude,
      longitude         : input.longitude,
      withinCityBoundary: placement?.withinCityBoundary ?? false,
      contactName       : input.contactName?.trim() || null,
      contactEmail      : input.contactEmail?.trim() || null,
      contactPhone      : input.contactPhone?.trim() || null,
      note              : input.note?.trim() || null,
      source            : "admin",
    },
  })

  serviceLog.info({ signalId: signal.id, cityId: city.id, type: input.type, actorId }, "Market signal logged")
  auditService.log({
    adminUserId: actorId,
    action     : "market_signal.created",
    entityType : "MarketSignal",
    entityId   : signal.id,
    changes    : { after: { type: signal.type, cityId: city.id, zoneId: signal.zoneId } },
  })

  return signal
}

export async function updateMarketSignalStatus(
  signalId: string,
  status  : string,
  actorId : string,
  scope   : AdminScopeContext,
) {
  if (!VALID_STATUSES.includes(status as MarketSignalStatusT)) {
    throw new ApiError(400, `status must be one of: ${VALID_STATUSES.join(", ")}`, "INVALID_STATUS")
  }

  const signal = await prisma.marketSignal.findUnique({
    where  : { id: signalId },
    include: { city: { select: { id: true, countryId: true } } },
  })
  if (!signal) throw new ApiError(404, "Market signal not found", "NOT_FOUND")
  assertCityInScope(signal.city, scope)

  const updated = await prisma.marketSignal.update({
    where: { id: signalId },
    data : {
      status           : status as MarketSignalStatus,
      reviewedByAdminId: status === "OPEN" ? null : actorId,
      reviewedAt       : status === "OPEN" ? null : new Date(),
    },
  })

  auditService.log({
    adminUserId: actorId,
    action     : "market_signal.status_changed",
    entityType : "MarketSignal",
    entityId   : signalId,
    changes    : { before: { status: signal.status }, after: { status } },
  })

  return updated
}
