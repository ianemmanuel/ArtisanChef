import { prisma, GeoStatus, VendorStatus, VendorTypeStatus } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/middleware/error"
import { UUID_RE } from "@/constants/system"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"

const serviceLog = logger.child({ module: "admin-vendor-type-service" })

function assertCountryInScope(countryId: string, scope: AdminScopeContext): void {
  if (!scope.isGlobal && !scope.countryIds.includes(countryId)) {
    throw new ApiError(403, "This country is outside your scope", "SCOPE_FORBIDDEN")
  }
}

/*
 * :countryRef on the shared country router (see admin.country.routes.ts)
 * is UUID-or-slug everywhere else (resolveCountryId in
 * admin.country.service.ts) — these vendor-type-country endpoints hang
 * off the same router/param and need the same resolution, otherwise a
 * slug like "be" fails a bare findUnique({ where: { id } }) and 404s.
 */
async function resolveCountryId(idOrSlug: string): Promise<string> {
  const isUuid = UUID_RE.test(idOrSlug)
  const country = await prisma.country.findFirst({
    where : isUuid ? { id: idOrSlug } : { slug: idOrSlug },
    select: { id: true },
  })
  if (!country) throw new ApiError(404, "Country not found", "NOT_FOUND")
  return country.id
}

/*
 * VendorType is a global entity (Restaurant, Bakery, ...), not owned by
 * any single country — see VendorTypeCountry for the per-country join.
 * Mutating the global definition is therefore global-scope-only, same
 * as country activation — this isn't a new rule, it mirrors
 * admin.country.service.ts's activateCountry exactly.
 */
function assertGlobalScope(scope: AdminScopeContext): void {
  if (!scope.isGlobal) {
    throw new ApiError(403, "Operation beyond your current scope", "SCOPE_FORBIDDEN")
  }
}

export interface ListVendorTypesParams {
  page?    : number
  pageSize?: number
  search?  : string
  status?  : VendorTypeStatus
  /**
   * Narrow to vendor types available in one country. Ignored for
   * non-global admins — their own scope.countryIds is always used
   * instead, so a country-tier admin can never widen their own view by
   * passing a different countryId.
   */
  countryId?: string
}

/*
 * Scope-aware catalog list. Country-tier admins only ever see vendor
 * types enabled (VendorTypeCountry.status ACTIVE) in their own
 * country/countries — the same "vendor types available where I am"
 * framing as listVendorTypesForCountry, just folded into the one list
 * endpoint the frontend calls regardless of tier. Global admins see the
 * full catalog unless they explicitly narrow via countryId.
 */
export async function listVendorTypes(scope: AdminScopeContext, params: ListVendorTypesParams = {}) {
  const { page = 1, pageSize = 10, search, status } = params
  const skip = (page - 1) * pageSize

  const scopedCountryIds = scope.isGlobal
    ? (params.countryId ? [params.countryId] : undefined)
    : scope.countryIds

  const where: any = {
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    ...(status ? { status } : {}),
    ...(scopedCountryIds
      ? { countries: { some: { countryId: { in: scopedCountryIds }, status: GeoStatus.ACTIVE } } }
      : {}),
  }

  const [vendorTypes, total] = await Promise.all([
    prisma.vendorType.findMany({
      where,
      skip,
      take   : pageSize,
      orderBy: { name: "asc" },
      select : {
        id              : true,
        name            : true,
        description     : true,
        status          : true,
        createdAt       : true,
        _count          : { select: { countries: true } },
      },
    }),
    prisma.vendorType.count({ where }),
  ])

  return { vendorTypes, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

/*
 * Real vendor-account counts for one vendor type, scope-filtered — used
 * by the vendor-type detail page's headline stats. No revenue here (no
 * Order/Payment model exists yet); revenue stays mock, generated
 * separately in lib/mock on the frontend.
 */
export async function getVendorTypeStats(vendorTypeId: string, scope: AdminScopeContext) {
  const where: any = {
    vendorTypeId,
    deletedAt: null,
    ...(scope.isGlobal ? {} : { countryId: { in: scope.countryIds } }),
  }

  const grouped = await prisma.vendorAccount.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  })

  const total = grouped.reduce((sum, g) => sum + g._count._all, 0)
  const active = grouped.find((g) => g.status === VendorStatus.ACTIVE)?._count._all ?? 0
  const suspended = grouped.find((g) => g.status === VendorStatus.SUSPENDED)?._count._all ?? 0

  return { total, active, suspended }
}

export async function getVendorType(id: string) {
  const vendorType = await prisma.vendorType.findUnique({
    where  : { id },
    include: {
      countries: {
        include: { country: { select: { id: true, name: true, code: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!vendorType) throw new ApiError(404, "Vendor type not found", "NOT_FOUND")
  return vendorType
}

export async function createVendorType(
  input  : { name: string; description?: string },
  actorId: string,
  scope  : AdminScopeContext,
) {
  assertGlobalScope(scope)

  const duplicate = await prisma.vendorType.findUnique({ where: { name: input.name } })
  if (duplicate) throw new ApiError(409, "A vendor type with this name already exists", "DUPLICATE_VENDOR_TYPE")

  const vendorType = await prisma.vendorType.create({
    data: {
      name            : input.name,
      description     : input.description ?? null,
      createdByAdminId: actorId,
    },
  })

  serviceLog.info({ vendorTypeId: vendorType.id, actorId }, "Vendor type created")
  auditService.log({
    adminUserId: actorId,
    action     : "vendor_type.created",
    entityType : "VendorType",
    entityId   : vendorType.id,
    changes    : { after: { name: vendorType.name } },
  })

  return vendorType
}

export async function updateVendorType(
  id     : string,
  input  : { name?: string; description?: string },
  actorId: string,
  scope  : AdminScopeContext,
) {
  assertGlobalScope(scope)

  const existing = await prisma.vendorType.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, "Vendor type not found", "NOT_FOUND")

  if (input.name && input.name !== existing.name) {
    const duplicate = await prisma.vendorType.findFirst({ where: { name: input.name, id: { not: id } } })
    if (duplicate) throw new ApiError(409, "A vendor type with this name already exists", "DUPLICATE_VENDOR_TYPE")
  }

  const updated = await prisma.vendorType.update({
    where: { id },
    data : {
      ...(input.name != null ? { name: input.name } : {}),
      ...(input.description != null ? { description: input.description } : {}),
    },
  })

  serviceLog.info({ vendorTypeId: id, actorId }, "Vendor type updated")
  auditService.log({
    adminUserId: actorId,
    action     : "vendor_type.updated",
    entityType : "VendorType",
    entityId   : id,
    changes    : { before: { name: existing.name }, after: { name: updated.name } },
  })

  return updated
}

export async function activateVendorType(id: string, actorId: string, scope: AdminScopeContext) {
  assertGlobalScope(scope)

  const existing = await prisma.vendorType.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, "Vendor type not found", "NOT_FOUND")
  if (existing.status === VendorTypeStatus.ACTIVE) {
    throw new ApiError(400, "Vendor type is already active", "ALREADY_ACTIVE")
  }

  await prisma.vendorType.update({ where: { id }, data: { status: VendorTypeStatus.ACTIVE } })

  serviceLog.info({ vendorTypeId: id, actorId }, "Vendor type activated")
  auditService.log({
    adminUserId: actorId,
    action     : "vendor_type.activated",
    entityType : "VendorType",
    entityId   : id,
    changes    : { before: { status: existing.status }, after: { status: VendorTypeStatus.ACTIVE } },
  })

  return { success: true }
}

export async function deactivateVendorType(id: string, actorId: string, scope: AdminScopeContext) {
  assertGlobalScope(scope)

  const existing = await prisma.vendorType.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, "Vendor type not found", "NOT_FOUND")
  if (existing.status === VendorTypeStatus.SUSPENDED) {
    throw new ApiError(400, "Vendor type is already suspended", "ALREADY_SUSPENDED")
  }

  await prisma.vendorType.update({ where: { id }, data: { status: VendorTypeStatus.SUSPENDED } })

  serviceLog.warn({ vendorTypeId: id, actorId }, "Vendor type suspended")
  auditService.log({
    adminUserId: actorId,
    action     : "vendor_type.deactivated",
    entityType : "VendorType",
    entityId   : id,
    changes    : { before: { status: existing.status }, after: { status: VendorTypeStatus.SUSPENDED } },
  })

  return { success: true }
}

//* ─── Country associations ───────────────────────────────────────────────

export async function listVendorTypesForCountry(countryIdOrSlug: string, scope: AdminScopeContext) {
  const countryId = await resolveCountryId(countryIdOrSlug)
  assertCountryInScope(countryId, scope)

  const links = await prisma.vendorTypeCountry.findMany({
    where  : { countryId },
    include: { vendorType: { select: { id: true, name: true, description: true, status: true } } },
    orderBy: { createdAt: "asc" },
  })

  if (links.length === 0) return links

  // How many vendor accounts of each category actually operate in this
  // country — the "grouped and numbered by vendor type" figure shown
  // alongside each category on /countries/[slug]/vendor-categories.
  const counts = await prisma.vendorAccount.groupBy({
    by     : ["vendorTypeId"],
    where  : { countryId, vendorTypeId: { in: links.map((l) => l.vendorTypeId) }, deletedAt: null },
    _count : true,
  })
  const countByVendorTypeId = new Map(counts.map((c) => [c.vendorTypeId, c._count]))

  return links.map((link) => ({ ...link, vendorAccountCount: countByVendorTypeId.get(link.vendorTypeId) ?? 0 }))
}

export async function assignVendorTypeToCountry(
  vendorTypeId    : string,
  countryIdOrSlug : string,
  actorId         : string,
  scope           : AdminScopeContext,
) {
  const countryId = await resolveCountryId(countryIdOrSlug)
  assertCountryInScope(countryId, scope)

  const [vendorType, country] = await Promise.all([
    prisma.vendorType.findUnique({ where: { id: vendorTypeId } }),
    prisma.country.findUnique({ where: { id: countryId } }),
  ])
  if (!vendorType) throw new ApiError(404, "Vendor type not found", "NOT_FOUND")
  if (!country) throw new ApiError(404, "Country not found", "NOT_FOUND")

  const existing = await prisma.vendorTypeCountry.findUnique({
    where: { countryId_vendorTypeId: { countryId, vendorTypeId } },
  })
  if (existing) {
    if (existing.status === GeoStatus.ACTIVE) {
      throw new ApiError(409, "This vendor type is already available in this country", "ALREADY_ASSIGNED")
    }
    // Re-enable a previously removed association instead of creating a duplicate row.
    const reactivated = await prisma.vendorTypeCountry.update({
      where: { id: existing.id },
      data : { status: GeoStatus.ACTIVE },
    })

    serviceLog.info({ vendorTypeId, countryId, actorId }, "Vendor type re-enabled for country")
    auditService.log({
      adminUserId: actorId,
      action     : "vendor_type_country.assigned",
      entityType : "VendorTypeCountry",
      entityId   : reactivated.id,
      changes    : { before: { status: "INACTIVE" }, after: { status: "ACTIVE" } },
    })

    return reactivated
  }

  const created = await prisma.vendorTypeCountry.create({
    data: { countryId, vendorTypeId, createdByAdminId: actorId },
  })

  serviceLog.info({ vendorTypeId, countryId, actorId }, "Vendor type assigned to country")
  auditService.log({
    adminUserId: actorId,
    action     : "vendor_type_country.assigned",
    entityType : "VendorTypeCountry",
    entityId   : created.id,
    changes    : { after: { countryId, vendorTypeId } },
  })

  return created
}

export async function removeVendorTypeFromCountry(
  vendorTypeId    : string,
  countryIdOrSlug : string,
  actorId         : string,
  scope           : AdminScopeContext,
) {
  const countryId = await resolveCountryId(countryIdOrSlug)
  assertCountryInScope(countryId, scope)

  const existing = await prisma.vendorTypeCountry.findUnique({
    where: { countryId_vendorTypeId: { countryId, vendorTypeId } },
  })
  if (!existing) throw new ApiError(404, "This vendor type is not assigned to this country", "NOT_FOUND")
  if (existing.status === GeoStatus.INACTIVE) {
    throw new ApiError(400, "This vendor type is already inactive for this country", "ALREADY_INACTIVE")
  }

  await prisma.vendorTypeCountry.update({ where: { id: existing.id }, data: { status: GeoStatus.INACTIVE } })

  serviceLog.warn({ vendorTypeId, countryId, actorId }, "Vendor type removed from country")
  auditService.log({
    adminUserId: actorId,
    action     : "vendor_type_country.removed",
    entityType : "VendorTypeCountry",
    entityId   : existing.id,
    changes    : { before: { status: "ACTIVE" }, after: { status: "INACTIVE" } },
  })

  return { success: true }
}
