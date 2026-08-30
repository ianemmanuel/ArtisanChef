/**
 * capabilities.ts — the single capability chokepoint for operational geography.
 *
 * Pure functions — no I/O, no side-effects, no @repo/db dependency.
 *
 * Two things live here:
 *   1. ZONE_CAPABILITIES — the ONE place a ZoneLevel is mapped to boolean
 *      capability flags. Business logic checks the flags, never `level >= X`.
 *   2. resolveCapabilities() — given a location (or an outlet's already-known
 *      zone assignment) plus the city's boundary + zones, returns the full
 *      capability picture: is it inside the boundary, which zone, what the tier
 *      allows structurally, and what is actually possible right now given the
 *      zone's operational status.
 *
 * The caller fetches the city boundary + zones and passes them in. Wiring this
 * to Prisma and to the outlet/order/meal-plan flows is a later stage.
 */

import type {
  CityBoundary,
  GeoPoint,
  ResolvedZoneCapabilities,
  ZoneCapabilityFlags,
  ZoneLevel,
  ZoneResolutionInput,
} from "./types"
import { isPointInCityBoundary, isPointInServiceArea } from "./point-in-polygon"

// ─── Level ordering ───────────────────────────────────────────────────────────

/** Least → most capable. Index doubles as the level's rank. */
export const ZONE_LEVEL_ORDER = [
  "REGISTRATION_ONLY",
  "MARKETPLACE",
  "PLATFORM_DELIVERY",
  "FULL_OPERATIONS",
] as const satisfies readonly ZoneLevel[]

export function zoneLevelRank(level: ZoneLevel): number {
  return ZONE_LEVEL_ORDER.indexOf(level)
}

export function zoneLevelAtLeast(level: ZoneLevel, minimum: ZoneLevel): boolean {
  return zoneLevelRank(level) >= zoneLevelRank(minimum)
}

// ─── Level → capability flags ─────────────────────────────────────────────────

/**
 * The authoritative mapping. Monotonic by inspection — every column only ever
 * goes false → true as you move down the list, never back. If the ladder ever
 * grows a non-linear rung (e.g. a ghost-kitchen zone: meal plans but no
 * self-delivery), this is the only place that changes.
 */
export const ZONE_CAPABILITIES: Record<ZoneLevel, ZoneCapabilityFlags> = {
  REGISTRATION_ONLY: {
    canRegisterOutlet          : true,
    canListOnDemand            : false,
    canSelfDeliverOnDemand     : false,
    canPlatformDeliverOnDemand : false,
    canOfferMealPlans          : false,
  },
  MARKETPLACE: {
    canRegisterOutlet          : true,
    canListOnDemand            : true,
    canSelfDeliverOnDemand     : true,
    canPlatformDeliverOnDemand : false,
    canOfferMealPlans          : false,
  },
  PLATFORM_DELIVERY: {
    canRegisterOutlet          : true,
    canListOnDemand            : true,
    canSelfDeliverOnDemand     : true,
    canPlatformDeliverOnDemand : true,
    canOfferMealPlans          : false,
  },
  FULL_OPERATIONS: {
    canRegisterOutlet          : true,
    canListOnDemand            : true,
    canSelfDeliverOnDemand     : true,
    canPlatformDeliverOnDemand : true,
    canOfferMealPlans          : true,
  },
}

const NO_CAPABILITIES: ZoneCapabilityFlags = {
  canRegisterOutlet          : false,
  canListOnDemand            : false,
  canSelfDeliverOnDemand     : false,
  canPlatformDeliverOnDemand : false,
  canOfferMealPlans          : false,
}

export function capabilityFlagsForLevel(level: ZoneLevel): ZoneCapabilityFlags {
  return ZONE_CAPABILITIES[level]
}

const LEVEL_LABEL: Record<ZoneLevel, string> = {
  REGISTRATION_ONLY: "Registration only",
  MARKETPLACE      : "Marketplace",
  PLATFORM_DELIVERY: "Platform delivery",
  FULL_OPERATIONS  : "Full operations",
}

// ─── The resolver ─────────────────────────────────────────────────────────────

export type ResolveCapabilitiesInput =
  | {
      /** Resolve a raw location by point-in-polygon against the city's zones. */
      by          : "point"
      point       : GeoPoint
      cityStatus  : string
      cityBoundary: CityBoundary | null
      zones       : ZoneResolutionInput[]
    }
  | {
      /**
       * Resolve from an outlet's already-known zone assignment (Outlet.zoneId).
       * `zone` null → an outlet inside the boundary that resolved to no zone
       * (the REGISTRATION_ONLY floor). An assignment implies the outlet passed
       * the boundary check at creation, so `withinCityBoundary` is true here.
       */
      by        : "zone"
      zone      : ZoneResolutionInput | null
      cityStatus: string
    }

export function resolveCapabilities(
  input: ResolveCapabilitiesInput,
): ResolvedZoneCapabilities {
  const cityActive = input.cityStatus === "ACTIVE"

  let withinCityBoundary: boolean
  let boundaryConfigured: boolean
  let zone: ZoneResolutionInput | null

  if (input.by === "zone") {
    boundaryConfigured = true
    withinCityBoundary = true
    zone = input.zone && input.zone.status === "ACTIVE" ? input.zone : null
  } else {
    boundaryConfigured = input.cityBoundary != null
    withinCityBoundary =
      input.cityBoundary != null && isPointInCityBoundary(input.point, input.cityBoundary)
    zone = withinCityBoundary ? matchZone(input.point, input.zones) : null
  }

  const effectiveLevel: ZoneLevel | null = !withinCityBoundary
    ? null
    : zone
      ? zone.level
      : "REGISTRATION_ONLY"

  const structural: ZoneCapabilityFlags = effectiveLevel
    ? ZONE_CAPABILITIES[effectiveLevel]
    : NO_CAPABILITIES

  const operationalStatus = zone ? zone.operationalStatus : null

  const isOperational =
    withinCityBoundary &&
    cityActive &&
    (zone ? zone.operationalStatus === "ACTIVE" : true)

  return {
    boundaryConfigured,
    withinCityBoundary,
    cityActive,
    zoneId  : zone?.id ?? null,
    zoneName: zone?.name ?? null,
    level   : zone?.level ?? null,
    effectiveLevel,
    operationalStatus,
    isOperational,
    ...structural,
    canAcceptOnDemandOrders: structural.canListOnDemand && isOperational,
    canAcceptMealPlanOrders: structural.canOfferMealPlans && isOperational,
    reason: buildReason({ boundaryConfigured, withinCityBoundary, cityActive, zone }),
  }
}

// ─── Internal ─────────────────────────────────────────────────────────────────

/**
 * First ACTIVE zone whose polygon contains the point. Zones are meant to tile
 * the city with no overlaps (enforced at draw time in a later stage); if an
 * overlap slips through, the most restrictive (lowest-level) matching zone
 * wins — over-permitting on a config error is the worse failure.
 */
function matchZone(
  point: GeoPoint,
  zones: ZoneResolutionInput[],
): ZoneResolutionInput | null {
  const matches = zones
    .filter((z) => z.status === "ACTIVE" && isPointInServiceArea(point, z.boundaries))
    .sort(
      (a, b) =>
        zoneLevelRank(a.level) - zoneLevelRank(b.level) || a.name.localeCompare(b.name),
    )
  return matches[0] ?? null
}

function buildReason(c: {
  boundaryConfigured: boolean
  withinCityBoundary: boolean
  cityActive        : boolean
  zone              : ZoneResolutionInput | null
}): string {
  if (!c.boundaryConfigured) return "City operational boundary is not configured"
  if (!c.withinCityBoundary) return "Location is outside the city operational boundary"
  if (!c.cityActive)         return "City is not active"
  if (!c.zone)               return "Inside the city boundary but not covered by any zone — registration only"
  if (c.zone.operationalStatus !== "ACTIVE") {
    return `Zone "${c.zone.name}" is ${c.zone.operationalStatus.toLowerCase()}`
  }
  return `Zone "${c.zone.name}" — ${LEVEL_LABEL[c.zone.level]}`
}
