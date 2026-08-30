import { prisma, OutletReviewStatus, OutletAdminStatus } from "@repo/db"
import { ApiError } from "@/middleware/error"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"
import { SYSTEM_USER_ID } from "@/constants/system"
import { Filter } from "bad-words"
import { OUTLET_PROXIMITY_DEGREES, MAX_TEMP_CLOSURE_DAYS } from "@/constants/vendor"
import { resolveCapabilitiesForPoint, resolveCapabilitiesForOutlet } from "./vendor.geography.service"
import { getOutletDocumentRequirements } from "./vendor.document.service"
import type {
  CreateOutletRequest, UpdateOutletRequest, OperatingHoursEntry,
  OutletGoLiveStatus, OutletGoLiveBlocker,
  OutletMealPlanReadiness, OutletMealPlanBlocker,
} from "@repo/types/backend"

/*
 * Doc-gated go-live (build order #3): a brand-new outlet whose city + vendor
 * type has a CRITICAL-severity required OUTLET document starts life at
 * clearanceStatus PENDING_DOCUMENTS and cannot take orders until that
 * document is uploaded and approved. A requirement with a future enforcedFrom
 * (a transition window an admin set) doesn't gate anyone yet — it applies
 * uniformly once the date passes (a later cron re-evaluates existing outlets).
 */
async function resolveInitialClearance(
  vendor: { countryId: string; vendorTypeId: string },
  cityId: string,
): Promise<"PENDING_DOCUMENTS" | "CLEARED"> {
  const reqs = await getOutletDocumentRequirements({ countryId: vendor.countryId, vendorTypeId: vendor.vendorTypeId, cityId })
  const now = new Date()
  const hasUnmetCritical = reqs.some(
    (r) =>
      r.complianceSeverity === "CRITICAL" &&
      (r.vendorTypeConfigs[0]?.isRequired ?? r.isRequired) &&
      !(r.enforcedFrom && r.enforcedFrom > now),
  )
  return hasUnmetCritical ? "PENDING_DOCUMENTS" : "CLEARED"
}

const serviceLog = logger.child({ module: "vendor-outlet-service" })
const profanityFilter = new Filter()

//* City-boundary enforcement + operational-zone resolution
// The outlet's coordinates must fall inside the city's operational boundary
// polygon — once one is configured. Pre-boundary cities stay lenient (matching
// the old bounding-box behaviour). The resolved operational zone is stored on
// Outlet.zoneId; a location inside the boundary but covered by no zone is left
// unzoned (the REGISTRATION_ONLY floor, resolved live). Recomputation when a
// zone's geometry later changes is handled admin-side
// (recomputeOutletZonesForCity).

async function resolveOutletZone(
  cityId   : string,
  latitude : number,
  longitude: number,
): Promise<string | null> {
  const placement = await resolveCapabilitiesForPoint(cityId, { latitude, longitude })
  if (!placement) return null // city was validated by the caller; treat a race as unzoned

  if (placement.boundaryConfigured && !placement.withinCityBoundary) {
    throw new ApiError(
      400,
      "The outlet's location falls outside the city operational boundary. Outlets can only be registered inside the area where the platform operates.",
      "OUTSIDE_CITY_BOUNDARY",
    )
  }
  return placement.zoneId
}

//* Flag checks

async function runFlagChecks(
  vendorId       : string,
  cityId         : string,
  name           : string,
  latitude       : number,
  longitude      : number,
  excludeOutletId?: string,
): Promise<string[]> {
  const flags: string[] = []

  if (profanityFilter.isProfane(name)) {
    flags.push("INAPPROPRIATE_NAME")
  }

  const duplicateName = await prisma.outlet.findFirst({
    where: {
      vendorId,
      cityId,
      name     : { equals: name, mode: "insensitive" },
      deletedAt: null,
      ...(excludeOutletId ? { id: { not: excludeOutletId } } : {}),
    },
  })
  if (duplicateName) flags.push("DUPLICATE_NAME_IN_CITY")

  const nearby = await prisma.outlet.findFirst({
    where: {
      vendorId,
      deletedAt: null,
      latitude : { gte: latitude  - OUTLET_PROXIMITY_DEGREES, lte: latitude  + OUTLET_PROXIMITY_DEGREES },
      longitude: { gte: longitude - OUTLET_PROXIMITY_DEGREES, lte: longitude + OUTLET_PROXIMITY_DEGREES },
      ...(excludeOutletId ? { id: { not: excludeOutletId } } : {}),
    },
  })
  if (nearby) flags.push("DUPLICATE_COORDINATES")

  return flags
}

//* Ownership guard

async function assertVendorOwnsOutlet(outletId: string, vendorId: string) {
  const outlet = await prisma.outlet.findUnique({ where: { id: outletId } })
  if (!outlet || outlet.deletedAt)  throw new ApiError(404, "Outlet not found", "NOT_FOUND")
  if (outlet.vendorId !== vendorId) throw new ApiError(403, "Unauthorized", "FORBIDDEN")
  return outlet
}

//* Flag audit logging

function logFlagEvent(outletId: string, flagReasons: string[], context: "created" | "updated") {
  auditService.log({
    adminUserId: SYSTEM_USER_ID,
    action     : "outlet.flagged",
    entityType : "Outlet",
    entityId   : outletId,
    changes    : { after: { flagReasons } },
    metadata   : { context },
  })
}

//* Create outlet

export async function createOutlet(vendorId: string, input: CreateOutletRequest) {
  const {
    name, addressLine1, addressLine2, cityId, neighborhood,
    postalCode, latitude, longitude, phone, email, bio,
    deliveryRadius, minimumOrder, deliveryFee,
  } = input

  const vendor = await prisma.vendorAccount.findUnique({
    where : { id: vendorId },
    select: { id: true, status: true, countryId: true, vendorTypeId: true },
  })
  if (!vendor) throw new ApiError(404, "Vendor account not found", "NOT_FOUND")
  if (vendor.status !== "ACTIVE") throw new ApiError(403, "Your account is not active", "ACCOUNT_INACTIVE")

  const city = await prisma.city.findUnique({
    where : { id: cityId },
    select: { id: true, countryId: true, status: true },
  })
  if (!city) throw new ApiError(404, "City not found", "NOT_FOUND")
  if (city.countryId !== vendor.countryId) throw new ApiError(400, "City does not belong to your registered country", "CITY_COUNTRY_MISMATCH")
  if (city.status !== "ACTIVE") throw new ApiError(400, "This city is not currently active", "CITY_INACTIVE")

  const zoneId = await resolveOutletZone(cityId, latitude, longitude)
  const clearanceStatus = await resolveInitialClearance(vendor, cityId)

  const flagReasons   = await runFlagChecks(vendorId, cityId, name, latitude, longitude)
  const isFlagged     = flagReasons.length > 0
  const existingCount = await prisma.outlet.count({ where: { vendorId, deletedAt: null } })

  const outlet = await prisma.outlet.create({
    data: {
      vendorId,
      cityId,
      zoneId,
      clearanceStatus,
      clearanceUpdatedAt: clearanceStatus === "PENDING_DOCUMENTS" ? new Date() : null,
      name,
      addressLine1,
      addressLine2  : addressLine2   ?? null,
      neighborhood  : neighborhood   ?? null,
      postalCode    : postalCode     ?? null,
      latitude,
      longitude,
      phone         : phone          ?? null,
      email         : email          ?? null,
      bio           : bio            ?? null,
      deliveryRadius: deliveryRadius ?? null,
      minimumOrder  : minimumOrder   ?? null,
      deliveryFee   : deliveryFee    ?? null,
      isMainOutlet  : existingCount === 0,
      adminStatus   : OutletAdminStatus.ACTIVE,
      reviewStatus  : isFlagged ? OutletReviewStatus.FLAGGED : OutletReviewStatus.AUTO_APPROVED,
      flagReasons,
      flaggedAt     : isFlagged ? new Date() : null,
    },
  })

  if (isFlagged) {
    serviceLog.warn({ outletId: outlet.id, vendorId, flagReasons }, "Outlet flagged on creation — pending admin review")
    logFlagEvent(outlet.id, flagReasons, "created")
  } else {
    serviceLog.info({ outletId: outlet.id, vendorId, clearanceStatus }, "Outlet created")
  }

  return outlet
}

//* Update outlet

export async function updateOutlet(vendorId: string, outletId: string, input: UpdateOutletRequest) {
  const existing = await assertVendorOwnsOutlet(outletId, vendorId)

  if (existing.adminStatus === OutletAdminStatus.BANNED) {
    throw new ApiError(403, "This outlet has been banned and cannot be edited", "OUTLET_BANNED")
  }
  if (existing.adminStatus === OutletAdminStatus.SUSPENDED) {
    throw new ApiError(403, "This outlet is suspended and cannot be edited", "OUTLET_SUSPENDED")
  }
  if (existing.adminStatus === "SUSPENDED_COMPLIANCE") {
    throw new ApiError(
      403,
      "This outlet is suspended because a required document expired. Upload a current version under Documents to restore it.",
      "OUTLET_SUSPENDED_COMPLIANCE",
    )
  }

  const newLat  = input.latitude  ?? existing.latitude
  const newLng  = input.longitude ?? existing.longitude
  const newName = input.name      ?? existing.name

  const coordinatesChanged = input.latitude != null || input.longitude != null
  const nameChanged        = input.name != null && input.name !== existing.name

  let zoneId: string | null | undefined = undefined
  if (coordinatesChanged) {
    zoneId = await resolveOutletZone(existing.cityId, newLat, newLng)
  }

  let flagReasons     = existing.flagReasons as string[]
  let reviewStatus    = existing.reviewStatus
  let rejectionReason = existing.rejectionReason

  if (coordinatesChanged || nameChanged) {
    flagReasons  = await runFlagChecks(vendorId, existing.cityId, newName, newLat, newLng, outletId)
    reviewStatus = flagReasons.length > 0 ? OutletReviewStatus.FLAGGED : OutletReviewStatus.AUTO_APPROVED
    // A fresh edit supersedes a prior admin rejection — same convention
    // as vendor.profile.service.ts's upsertVendorProfile.
    rejectionReason = null
    if (flagReasons.length > 0) {
      serviceLog.warn({ outletId, vendorId, flagReasons }, "Outlet update introduced flags")
      logFlagEvent(outletId, flagReasons, "updated")
    }
  }

  const updated = await prisma.outlet.update({
    where: { id: outletId },
    data : {
      ...(input.name           != null ? { name          : input.name           } : {}),
      ...(input.addressLine1   != null ? { addressLine1  : input.addressLine1   } : {}),
      ...(input.addressLine2   != null ? { addressLine2  : input.addressLine2   } : {}),
      ...(input.neighborhood   != null ? { neighborhood  : input.neighborhood   } : {}),
      ...(input.postalCode     != null ? { postalCode    : input.postalCode     } : {}),
      ...(input.phone          != null ? { phone         : input.phone          } : {}),
      ...(input.email          != null ? { email         : input.email          } : {}),
      ...(input.bio            != null ? { bio           : input.bio            } : {}),
      ...(input.deliveryRadius != null ? { deliveryRadius: input.deliveryRadius } : {}),
      ...(input.minimumOrder   != null ? { minimumOrder  : input.minimumOrder   } : {}),
      ...(input.deliveryFee    != null ? { deliveryFee   : input.deliveryFee    } : {}),
      ...(input.latitude       != null ? { latitude      : input.latitude       } : {}),
      ...(input.longitude      != null ? { longitude     : input.longitude      } : {}),
      ...(zoneId !== undefined ? { zoneId } : {}),
      flagReasons,
      reviewStatus,
      rejectionReason,
      flaggedAt: flagReasons.length > 0 ? new Date() : existing.flaggedAt,
    },
  })

  serviceLog.info({ outletId, vendorId }, "Outlet updated")
  return updated
}

//* Get single outlet

export async function getOutlet(vendorId: string, outletId: string) {
  const outlet = await prisma.outlet.findUnique({
    where  : { id: outletId },
    include: {
      cuisines      : { include: { cuisine: { select: { id: true, name: true, code: true } } } },
      operatingHours: { orderBy: { dayOfWeek: "asc" } },
      zone          : { select: { id: true, name: true, level: true, operationalStatus: true, status: true } },
    },
  })

  if (!outlet || outlet.deletedAt) throw new ApiError(404, "Outlet not found", "NOT_FOUND")
  if (outlet.vendorId !== vendorId) throw new ApiError(403, "Unauthorized", "FORBIDDEN")

  const [city, goLiveStatus, mealPlanReadiness] = await Promise.all([
    prisma.city.findUnique({
      where : { id: outlet.cityId },
      select: { id: true, name: true, timezone: true },
    }),
    getOutletGoLiveStatus(outletId),
    getOutletMealPlanReadiness(outletId),
  ])

  return { ...outlet, city, goLiveStatus, mealPlanReadiness }
}

//* Meal-plan eligibility — the single chokepoint a future meal-plan-creation
//* flow calls. An outlet may offer meal plans only when it's cleared for
//* on-demand serving, sits in a FULL_OPERATIONS operational zone, AND (per
//* Country.outletInspectionPolicy) has a current passing — or explicitly
//* waived — physical premises inspection. Deliberately NOT a gate on
//* on-demand serving itself, matching Uber Eats / DoorDash. Computed live,
//* never stored (OutletMealPlanReadiness).

export async function getOutletMealPlanReadiness(outletId: string): Promise<OutletMealPlanReadiness> {
  const outlet = await prisma.outlet.findUnique({
    where : { id: outletId },
    select: {
      id: true, deletedAt: true,
      clearanceStatus: true, adminStatus: true, reviewStatus: true, isTemporarilyClosed: true,
      vendor: { select: { country: { select: { outletInspectionPolicy: true } } } },
    },
  })
  if (!outlet || outlet.deletedAt) throw new ApiError(404, "Outlet not found", "NOT_FOUND")

  const [caps, latestInspection] = await Promise.all([
    resolveCapabilitiesForOutlet(outletId),
    prisma.outletInspection.findFirst({
      where  : { outletId, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      select : { status: true, validUntil: true },
    }),
  ])

  const policy = outlet.vendor.country.outletInspectionPolicy
  const inspectionRequired = policy !== "NONE"
  const zoneAllowsMealPlans = !!caps?.canOfferMealPlans
  const now = new Date()
  const blockers: OutletMealPlanBlocker[] = []

  // The outlet must first be cleared for on-demand serving at all.
  const clearedToServe =
    outlet.clearanceStatus === "CLEARED" &&
    outlet.adminStatus === OutletAdminStatus.ACTIVE &&
    outlet.reviewStatus !== OutletReviewStatus.MANUALLY_REJECTED &&
    !outlet.isTemporarilyClosed
  if (!clearedToServe) blockers.push("NOT_CLEARED_TO_SERVE")

  if (!zoneAllowsMealPlans) blockers.push("ZONE_LEVEL_TOO_LOW")
  else if (!caps?.isOperational) blockers.push("ZONE_NOT_OPERATIONAL")

  if (inspectionRequired) {
    const s = latestInspection?.status ?? null
    if (s === null) blockers.push("INSPECTION_REQUIRED")
    else if (s === "SCHEDULED") blockers.push("INSPECTION_SCHEDULED")
    else if (s === "IN_PROGRESS") blockers.push("INSPECTION_IN_PROGRESS")
    else if (s === "FAILED") blockers.push("INSPECTION_FAILED")
    else if (s === "PASSED" && latestInspection?.validUntil && latestInspection.validUntil < now) {
      blockers.push("INSPECTION_EXPIRED")
    }
    // PASSED (unexpired) or WAIVED → no blocker.
  }

  return {
    outletId,
    eligible            : blockers.length === 0,
    policy,
    zoneAllowsMealPlans,
    inspectionRequired,
    inspectionStatus    : latestInspection?.status ?? null,
    inspectionValidUntil: latestInspection?.validUntil?.toISOString() ?? null,
    blockers,
  }
}

//* Go-live status — the outlet-level counterpart to getVendorGoLiveStatus.
//* Combines the outlet's own gates (clearance, admin status, content review,
//* temporary closure) with its operational zone (level + status) and, for
//* the customer-facing answer, whether the vendor's storefront is published.
//* Computed live, never stored (OutletGoLiveStatus). Backend is the source of
//* truth — the dashboards render off this, they never re-derive it.

export async function getOutletGoLiveStatus(outletId: string): Promise<OutletGoLiveStatus> {
  const outlet = await prisma.outlet.findUnique({
    where : { id: outletId },
    select: {
      id: true, vendorId: true, deletedAt: true,
      clearanceStatus: true, adminStatus: true, reviewStatus: true, isTemporarilyClosed: true,
    },
  })
  if (!outlet || outlet.deletedAt) throw new ApiError(404, "Outlet not found", "NOT_FOUND")

  const [profile, caps] = await Promise.all([
    prisma.vendorProfile.findUnique({
      where : { vendorAccountId: outlet.vendorId },
      select: { isPublished: true },
    }),
    resolveCapabilitiesForOutlet(outletId),
  ])

  const vendorPublished = profile?.isPublished ?? false
  const blockers: OutletGoLiveBlocker[] = []

  if (outlet.clearanceStatus === "PENDING_DOCUMENTS")                blockers.push("PENDING_DOCUMENTS")
  if (outlet.reviewStatus === OutletReviewStatus.MANUALLY_REJECTED)  blockers.push("REVIEW_REJECTED")
  if (outlet.adminStatus === OutletAdminStatus.SUSPENDED)            blockers.push("OUTLET_SUSPENDED")
  if (outlet.adminStatus === "SUSPENDED_COMPLIANCE")                 blockers.push("OUTLET_SUSPENDED_COMPLIANCE")
  if (outlet.adminStatus === OutletAdminStatus.BANNED)               blockers.push("OUTLET_BANNED")
  if (outlet.isTemporarilyClosed)                                    blockers.push("TEMPORARILY_CLOSED")

  if (!caps || !caps.canListOnDemand)  blockers.push("ZONE_LEVEL_TOO_LOW")
  else if (!caps.isOperational)        blockers.push("ZONE_NOT_OPERATIONAL")

  const isClearedToServe = blockers.length === 0
  if (!vendorPublished) blockers.push("VENDOR_NOT_LIVE")

  return {
    outletId         : outlet.id,
    clearanceStatus  : outlet.clearanceStatus,
    isClearedToServe,
    isAcceptingOrders: isClearedToServe && vendorPublished,
    vendorPublished,
    blockers,
    // Populated once OUTLET-scoped document requirements exist (build order #2/#3).
    criticalDocuments: [],
    zone: {
      id               : caps?.zoneId ?? null,
      name             : caps?.zoneName ?? null,
      level            : caps?.effectiveLevel ?? null,
      operationalStatus: caps?.operationalStatus ?? null,
      onDemandAllowed  : !!caps?.canAcceptOnDemandOrders,
    },
  }
}

//* Inspection history for one of the vendor's own outlets — read-only. The
//* vendor never schedules or acts on an inspection, they just see where it
//* stands (mirrors how a vendor sees, but can't act on, a compliance case).

export async function listOutletInspectionsForVendor(vendorId: string, outletId: string) {
  await assertVendorOwnsOutlet(outletId, vendorId)
  const rows = await prisma.outletInspection.findMany({
    where  : { outletId },
    orderBy: { createdAt: "desc" },
  })
  return rows.map((r) => ({
    id              : r.id,
    outletId        : r.outletId,
    status          : r.status,
    scheduledFor    : r.scheduledFor?.toISOString() ?? null,
    inspectorAdminId: r.inspectorAdminId,
    startedAt       : r.startedAt?.toISOString() ?? null,
    completedAt     : r.completedAt?.toISOString() ?? null,
    validUntil      : r.validUntil?.toISOString() ?? null,
    findings        : r.findings,
    failureReasons  : r.failureReasons,
    waiveReason     : r.waiveReason,
    notes           : r.notes,
    photoCount      : r.photos.length,
    createdAt       : r.createdAt.toISOString(),
  }))
}

//* List outlets

export async function listOutlets(vendorId: string) {
  const outlets = await prisma.outlet.findMany({
    where  : { vendorId, deletedAt: null },
    orderBy: [{ isMainOutlet: "desc" }, { createdAt: "asc" }],
    include: {
      cuisines: { include: { cuisine: { select: { id: true, name: true, code: true } } } },
      _count  : { select: { meals: true } },
    },
  })

  if (outlets.length === 0) return []

  const cityIds = [...new Set(outlets.map(o => o.cityId))]
  const cities  = await prisma.city.findMany({
    where : { id: { in: cityIds } },
    select: { id: true, name: true },
  })
  const cityMap = new Map(cities.map(c => [c.id, c]))

  return outlets.map(o => ({ ...o, city: cityMap.get(o.cityId) ?? null }))
}

//* Deactivate outlet

export async function deactivateOutlet(vendorId: string, outletId: string) {
  const existing = await assertVendorOwnsOutlet(outletId, vendorId)

  if (existing.adminStatus === OutletAdminStatus.BANNED) {
    throw new ApiError(403, "This outlet has been banned", "OUTLET_BANNED")
  }
  if (existing.vendorDisabledAt) {
    throw new ApiError(400, "This outlet is already deactivated", "ALREADY_DEACTIVATED")
  }

  await prisma.outlet.update({
    where: { id: outletId },
    data : {
      vendorDisabledAt      : new Date(),
      isTemporarilyClosed   : false,
      temporarilyClosedUntil: null,
    },
  })

  serviceLog.info({ outletId, vendorId }, "Outlet deactivated by vendor")
  return { success: true }
}

//* Reactivate outlet

export async function reactivateOutlet(vendorId: string, outletId: string) {
  const existing = await assertVendorOwnsOutlet(outletId, vendorId)

  if (!existing.vendorDisabledAt) {
    throw new ApiError(400, "This outlet is not deactivated", "NOT_DEACTIVATED")
  }
  if (existing.adminStatus !== OutletAdminStatus.ACTIVE) {
    throw new ApiError(403, "This outlet cannot be reactivated — contact support", "OUTLET_NOT_ACTIVE")
  }

  await prisma.outlet.update({
    where: { id: outletId },
    data : { vendorDisabledAt: null },
  })

  serviceLog.info({ outletId, vendorId }, "Outlet reactivated by vendor")
  return { success: true }
}

//* Temporarily close outlet

export async function closeOutletTemporarily(vendorId: string, outletId: string, reopenAt: Date) {
  const existing = await assertVendorOwnsOutlet(outletId, vendorId)

  if (existing.adminStatus !== OutletAdminStatus.ACTIVE) {
    throw new ApiError(403, "This outlet is not active", "OUTLET_NOT_ACTIVE")
  }
  if (existing.vendorDisabledAt) {
    throw new ApiError(400, "Outlet is deactivated. Reactivate it first.", "OUTLET_DEACTIVATED")
  }

  const now     = new Date()
  const maxDate = new Date(now.getTime() + MAX_TEMP_CLOSURE_DAYS * 24 * 60 * 60 * 1000)

  if (reopenAt <= now)    throw new ApiError(400, "Reopen date must be in the future", "INVALID_REOPEN_DATE")
  if (reopenAt > maxDate) throw new ApiError(400, `Temporary closure cannot exceed ${MAX_TEMP_CLOSURE_DAYS} days. Deactivate for longer closures.`, "CLOSURE_TOO_LONG")

  await prisma.outlet.update({
    where: { id: outletId },
    data : { isTemporarilyClosed: true, temporarilyClosedUntil: reopenAt },
  })

  serviceLog.info({ outletId, vendorId, reopenAt }, "Outlet temporarily closed")
  return { success: true, reopenAt }
}

//* Reopen outlet early

export async function reopenOutlet(vendorId: string, outletId: string) {
  const existing = await assertVendorOwnsOutlet(outletId, vendorId)

  if (!existing.isTemporarilyClosed) {
    throw new ApiError(400, "This outlet is not temporarily closed", "NOT_TEMPORARILY_CLOSED")
  }

  await prisma.outlet.update({
    where: { id: outletId },
    data : { isTemporarilyClosed: false, temporarilyClosedUntil: null },
  })

  serviceLog.info({ outletId, vendorId }, "Outlet reopened early by vendor")
  return { success: true }
}

//*Set primary outlet

export async function setPrimaryOutlet(vendorId: string, outletId: string) {
  await assertVendorOwnsOutlet(outletId, vendorId)

  await prisma.$transaction([
    prisma.outlet.updateMany({
      where: { vendorId, deletedAt: null },
      data : { isMainOutlet: false },
    }),
    prisma.outlet.update({
      where: { id: outletId },
      data : { isMainOutlet: true },
    }),
  ])

  serviceLog.info({ outletId, vendorId }, "Primary outlet updated")
  return { success: true }
}

//* Set operating hours

export async function setOperatingHours(vendorId: string, outletId: string, hours: OperatingHoursEntry[]) {
  await assertVendorOwnsOutlet(outletId, vendorId)
  if (hours.length === 0) throw new ApiError(400, "At least one day entry is required", "EMPTY_HOURS")

  await prisma.$transaction(
    hours.map(entry =>
      prisma.outletOperatingHours.upsert({
        where : { outletId_dayOfWeek_validFrom: { outletId, dayOfWeek: entry.dayOfWeek, validFrom: null! } },
        create: { outletId, ...entry, validFrom: null },
        update: { openTime: entry.openTime, closeTime: entry.closeTime, isClosed: entry.isClosed },
      })
    )
  )

  serviceLog.info({ outletId, vendorId }, "Operating hours updated")
  return { success: true }
}