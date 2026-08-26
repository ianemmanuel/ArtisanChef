import { prisma, DocumentTypeStatus } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/middleware/error"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"
import { getAllowedDocumentTypes } from "@/modules/vendor/services/vendor.document.service"

const serviceLog = logger.child({ module: "admin-document-type-service" })

/*
 * Codes are system-generated from the name (e.g. "Business Registration
 * Certificate" -> "BUSINESS_REGISTRATION_CERTIFICATE") rather than admin-
 * typed — asking an admin to hand-author a unique-per-country identifier
 * is unnecessary friction and a duplicate-code error is a bad first
 * experience. Collisions (same name reused within a country/city — e.g.
 * after a prior one was archived) resolve by appending "_2", "_3", ...
 */
function slugifyToCode(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics: é → e
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return base || "DOCUMENT_TYPE"
}

async function generateDocumentTypeCode(name: string, countryId: string, cityId: string | null): Promise<string> {
  const base = slugifyToCode(name)
  let code = base
  let suffix = 2
  while (await prisma.documentTypeConfig.findFirst({ where: { code, countryId, cityId } })) {
    code = `${base}_${suffix}`
    suffix += 1
  }
  return code
}

function assertCountryInScope(countryId: string, scope: AdminScopeContext): void {
  if (!scope.isGlobal && !scope.countryIds.includes(countryId)) {
    throw new ApiError(403, "This country is outside your scope", "SCOPE_FORBIDDEN")
  }
}

export async function listDocumentTypesForCountry(
  countryId: string,
  scope: AdminScopeContext,
  params: {
    page?      : number
    pageSize?  : number
    search?    : string
    isRequired?: boolean
    docScope?  : "VENDOR" | "OUTLET" | "CITY"
    status?    : (typeof DocumentTypeStatus)[keyof typeof DocumentTypeStatus]
  } = {},
) {
  assertCountryInScope(countryId, scope)

  const { page = 1, pageSize = 10, search, isRequired, docScope, status } = params
  const skip = (page - 1) * pageSize
  const where = {
    countryId,
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    ...(isRequired !== undefined ? { isRequired } : {}),
    ...(docScope ? { scope: docScope } : {}),
    ...(status ? { status } : {}),
  }

  const [documentTypes, total] = await Promise.all([
    prisma.documentTypeConfig.findMany({
      where,
      skip,
      take   : pageSize,
      include: {
        vendorTypeConfigs: {
          include: { vendorType: { select: { id: true, name: true } } },
        },
        city  : { select: { id: true, name: true } },
        _count: { select: { vendorDocuments: true, storeDocuments: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.documentTypeConfig.count({ where }),
  ])

  // deactivatedByAdminId is a plain id (not a Prisma relation — see
  // createdByAdminId elsewhere in this schema), so resolve display names
  // in a single batch, same technique as getCountryVendorSnapshot's
  // vendor-type-name Map.
  const deactivatorIds = [...new Set(documentTypes.map((d) => d.deactivatedByAdminId).filter((id): id is string => !!id))]
  const deactivatorMap = deactivatorIds.length > 0
    ? new Map(
        (await prisma.adminUser.findMany({ where: { id: { in: deactivatorIds } }, select: { id: true, firstName: true, lastName: true } }))
          .map((a) => [a.id, `${a.firstName} ${a.lastName}`.trim()]),
      )
    : new Map<string, string>()

  return {
    documentTypes: documentTypes.map((d) => {
      const { _count, ...rest } = d
      return {
        ...rest,
        documentCount    : _count.vendorDocuments + _count.storeDocuments,
        deactivatedByName: d.deactivatedByAdminId ? deactivatorMap.get(d.deactivatedByAdminId) ?? null : null,
      }
    }),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getDocumentType(id: string, scope: AdminScopeContext) {
  const documentType = await prisma.documentTypeConfig.findUnique({
    where  : { id },
    include: {
      vendorTypeConfigs: {
        include: { vendorType: { select: { id: true, name: true } } },
      },
      city  : { select: { id: true, name: true } },
      _count: { select: { vendorDocuments: true, storeDocuments: true } },
    },
  })

  if (!documentType) throw new ApiError(404, "Document type not found", "NOT_FOUND")
  assertCountryInScope(documentType.countryId, scope)

  const { _count, ...rest } = documentType
  return { ...rest, documentCount: _count.vendorDocuments + _count.storeDocuments }
}

/*
 * CITY scope means "tied to one specific city" (a vendor uploads it once
 * per city they operate in) — VENDOR and OUTLET are both nationwide by
 * definition, so cityId is meaningless for them and is force-cleared
 * regardless of what's passed. Validates the city belongs to the country
 * and exists when required.
 */
async function resolveCityForScope(
  docScope : "VENDOR" | "OUTLET" | "CITY",
  cityId   : string | undefined,
  countryId: string,
): Promise<string | null> {
  if (docScope !== "CITY") return null

  if (!cityId) throw new ApiError(400, "A city is required for a city-scoped document", "CITY_REQUIRED")
  const city = await prisma.city.findUnique({ where: { id: cityId } })
  if (!city) throw new ApiError(404, "City not found", "NOT_FOUND")
  if (city.countryId !== countryId) {
    throw new ApiError(400, "City does not belong to this country", "CITY_COUNTRY_MISMATCH")
  }
  return cityId
}

export async function createDocumentType(
  input: {
    name: string
    description?: string
    scope: "VENDOR" | "OUTLET" | "CITY"
    countryId: string
    cityId?: string
    isRequired?: boolean
    requiresExpiry?: boolean
    expiryWarningDays?: number
    instructions?: string
    sampleUrl?: string
    // Compliance framework (phase 2) — severity/grace default to the
    // schema's own defaults (MEDIUM/0) when omitted; enforcedFrom stays
    // null (enforced immediately) unless the admin deliberately sets a
    // future rollout date. See DocumentTypeConfig in schema.prisma.
    complianceSeverity?: "LOW" | "MEDIUM" | "CRITICAL"
    gracePeriodDays?: number
    enforcedFrom?: string
  },
  actorId: string,
  scope: AdminScopeContext,
) {
  assertCountryInScope(input.countryId, scope)

  const country = await prisma.country.findUnique({ where: { id: input.countryId } })
  if (!country) throw new ApiError(404, "Country not found", "NOT_FOUND")

  const cityId = await resolveCityForScope(input.scope, input.cityId, input.countryId)

  const code = await generateDocumentTypeCode(input.name, input.countryId, cityId)

  const documentType = await prisma.documentTypeConfig.create({
    data: {
      name             : input.name,
      code,
      description      : input.description ?? null,
      scope            : input.scope,
      countryId        : input.countryId,
      cityId,
      isRequired       : input.isRequired ?? true,
      requiresExpiry   : input.requiresExpiry ?? true,
      expiryWarningDays: input.expiryWarningDays ?? 30,
      instructions     : input.instructions ?? null,
      sampleUrl        : input.sampleUrl ?? null,
      createdByAdminId : actorId,
      ...(input.complianceSeverity ? { complianceSeverity: input.complianceSeverity } : {}),
      ...(input.gracePeriodDays != null ? { gracePeriodDays: input.gracePeriodDays } : {}),
      ...(input.enforcedFrom ? { enforcedFrom: new Date(input.enforcedFrom) } : {}),
    },
  })

  serviceLog.info({ documentTypeId: documentType.id, actorId }, "Document type created")
  auditService.log({
    adminUserId: actorId,
    action     : "document_type.created",
    entityType : "DocumentTypeConfig",
    entityId   : documentType.id,
    changes    : { after: { name: documentType.name, code: documentType.code, countryId: documentType.countryId } },
  })

  return documentType
}

export async function updateDocumentType(
  id: string,
  input: {
    name?: string
    description?: string
    scope?: "VENDOR" | "OUTLET" | "CITY"
    cityId?: string
    isRequired?: boolean
    requiresExpiry?: boolean
    expiryWarningDays?: number
    instructions?: string
    sampleUrl?: string
    complianceSeverity?: "LOW" | "MEDIUM" | "CRITICAL"
    gracePeriodDays?: number
    /** Empty string clears it back to null (immediate enforcement). */
    enforcedFrom?: string
  },
  actorId: string,
  scope: AdminScopeContext,
) {
  const existing = await prisma.documentTypeConfig.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, "Document type not found", "NOT_FOUND")
  assertCountryInScope(existing.countryId, scope)

  // Roadmap VM-P1-05 — changing scope (e.g. VENDOR -> CITY) after real
  // documents already exist against this type would quietly change what
  // those existing VendorDocument/OutletDocument rows mean. Once any exist,
  // block the change — deactivate-and-recreate is the safe path instead.
  if (input.scope != null && input.scope !== existing.scope) {
    const [vendorDocCount, outletDocCount] = await Promise.all([
      prisma.vendorDocument.count({ where: { documentTypeId: id } }),
      prisma.outletDocument.count({ where: { documentTypeId: id } }),
    ])
    if (vendorDocCount + outletDocCount > 0) {
      throw new ApiError(
        400,
        "This document type already has real documents uploaded against it — its scope can no longer be changed. Deactivate it and create a new one instead.",
        "SCOPE_CHANGE_BLOCKED",
      )
    }
  }

  // scope/cityId travel together — changing one without validating against
  // the other could leave a CITY-scoped doc with no city, or a stray city
  // on a VENDOR/OUTLET doc. Resolve whenever either is present in the input.
  const nextScope = input.scope ?? existing.scope
  const cityId = (input.scope != null || input.cityId != null)
    ? await resolveCityForScope(nextScope, input.cityId ?? existing.cityId ?? undefined, existing.countryId)
    : undefined

  const updated = await prisma.documentTypeConfig.update({
    where: { id },
    data : {
      ...(input.name != null ? { name: input.name } : {}),
      ...(input.description != null ? { description: input.description } : {}),
      ...(input.scope != null ? { scope: input.scope } : {}),
      ...(cityId !== undefined ? { cityId } : {}),
      ...(input.isRequired != null ? { isRequired: input.isRequired } : {}),
      ...(input.requiresExpiry != null ? { requiresExpiry: input.requiresExpiry } : {}),
      ...(input.expiryWarningDays != null ? { expiryWarningDays: input.expiryWarningDays } : {}),
      ...(input.instructions != null ? { instructions: input.instructions } : {}),
      ...(input.sampleUrl != null ? { sampleUrl: input.sampleUrl } : {}),
      ...(input.complianceSeverity != null ? { complianceSeverity: input.complianceSeverity } : {}),
      ...(input.gracePeriodDays != null ? { gracePeriodDays: input.gracePeriodDays } : {}),
      ...(input.enforcedFrom !== undefined ? { enforcedFrom: input.enforcedFrom ? new Date(input.enforcedFrom) : null } : {}),
    },
  })

  serviceLog.info({ documentTypeId: id, actorId }, "Document type updated")
  const changedKeys = Object.keys(input) as (keyof typeof input)[]
  auditService.log({
    adminUserId: actorId,
    action     : "document_type.updated",
    entityType : "DocumentTypeConfig",
    entityId   : id,
    changes    : {
      before: Object.fromEntries(changedKeys.map((k) => [k, existing[k as keyof typeof existing]])),
      after : Object.fromEntries(changedKeys.map((k) => [k, updated[k as keyof typeof updated]])),
    },
  })

  return updated
}

/*
 * Quick one-click VENDOR<->OUTLET toggle only — CITY is deliberately
 * excluded (rejected by the controller before this is even called): moving
 * to CITY scope needs a city picked, which doesn't fit a single-click
 * action. CITY scope changes go through updateDocumentType (the full edit
 * form) instead, see resolveCityForScope.
 */
export async function setDocumentTypeScope(
  id: string,
  docScope: "VENDOR" | "OUTLET",
  actorId: string,
  scope: AdminScopeContext,
) {
  const existing = await prisma.documentTypeConfig.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, "Document type not found", "NOT_FOUND")
  assertCountryInScope(existing.countryId, scope)

  if (existing.scope === docScope) {
    throw new ApiError(400, `Document is already scoped to ${docScope.toLowerCase()}s`, "NO_CHANGE")
  }

  const updated = await prisma.documentTypeConfig.update({ where: { id }, data: { scope: docScope } })

  serviceLog.info({ documentTypeId: id, actorId, scope: docScope }, "Document type scope changed")
  auditService.log({
    adminUserId: actorId,
    action     : "document_type.scope_changed",
    entityType : "DocumentTypeConfig",
    entityId   : id,
    changes    : { before: { scope: existing.scope }, after: { scope: docScope } },
  })

  return updated
}

export async function setDocumentTypeStatus(
  id: string,
  status: (typeof DocumentTypeStatus)[keyof typeof DocumentTypeStatus],
  actorId: string,
  scope: AdminScopeContext,
  reason?: string,
) {
  const existing = await prisma.documentTypeConfig.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, "Document type not found", "NOT_FOUND")
  assertCountryInScope(existing.countryId, scope)

  if (existing.status === status) {
    throw new ApiError(400, `Document type is already ${status.toLowerCase()}`, "NO_CHANGE")
  }

  const isDeactivating = status === DocumentTypeStatus.INACTIVE
  if (isDeactivating && !reason?.trim()) {
    throw new ApiError(400, "A reason is required to deactivate a document", "REASON_REQUIRED")
  }

  await prisma.documentTypeConfig.update({
    where: { id },
    data : {
      status,
      deactivatedByAdminId: isDeactivating ? actorId : null,
      deactivatedAt        : isDeactivating ? new Date() : null,
      deactivationReason   : isDeactivating ? reason!.trim() : null,
    },
  })

  serviceLog.info({ documentTypeId: id, actorId, status }, "Document type status changed")
  auditService.log({
    adminUserId: actorId,
    action     : "document_type.status_changed",
    entityType : "DocumentTypeConfig",
    entityId   : id,
    changes    : { before: { status: existing.status }, after: { status } },
    metadata   : isDeactivating ? { reason } : undefined,
  })

  return { success: true }
}

//* ─── Vendor type requirements ───────────────────────────────────────────

export async function assignDocumentTypeToVendorType(
  documentTypeId: string,
  vendorTypeId  : string,
  isRequired    : boolean | undefined,
  actorId       : string,
  scope         : AdminScopeContext,
) {
  const [documentType, vendorType] = await Promise.all([
    prisma.documentTypeConfig.findUnique({ where: { id: documentTypeId } }),
    prisma.vendorType.findUnique({ where: { id: vendorTypeId } }),
  ])
  if (!documentType) throw new ApiError(404, "Document type not found", "NOT_FOUND")
  if (!vendorType) throw new ApiError(404, "Vendor type not found", "NOT_FOUND")
  assertCountryInScope(documentType.countryId, scope)

  const duplicate = await prisma.documentTypeVendorType.findUnique({
    where: { documentTypeId_vendorTypeId: { documentTypeId, vendorTypeId } },
  })
  if (duplicate) {
    throw new ApiError(409, "This document type is already linked to this vendor type", "ALREADY_ASSIGNED")
  }

  const created = await prisma.documentTypeVendorType.create({
    data: { documentTypeId, vendorTypeId, isRequired: isRequired ?? true },
  })

  serviceLog.info({ documentTypeId, vendorTypeId, actorId }, "Document type assigned to vendor type")
  auditService.log({
    adminUserId: actorId,
    action     : "document_type_vendor_type.assigned",
    entityType : "DocumentTypeVendorType",
    entityId   : created.id,
    changes    : { after: { documentTypeId, vendorTypeId, isRequired: created.isRequired } },
  })

  return created
}

export async function updateDocumentTypeVendorTypeRequirement(
  id: string,
  isRequired: boolean,
  actorId: string,
  scope: AdminScopeContext,
) {
  const existing = await prisma.documentTypeVendorType.findUnique({
    where  : { id },
    include: { documentType: { select: { countryId: true } } },
  })
  if (!existing) throw new ApiError(404, "Requirement not found", "NOT_FOUND")
  assertCountryInScope(existing.documentType.countryId, scope)

  const updated = await prisma.documentTypeVendorType.update({ where: { id }, data: { isRequired } })

  serviceLog.info({ id, actorId, isRequired }, "Document type requirement updated")
  auditService.log({
    adminUserId: actorId,
    action     : "document_type_vendor_type.updated",
    entityType : "DocumentTypeVendorType",
    entityId   : id,
    changes    : { before: { isRequired: existing.isRequired }, after: { isRequired } },
  })

  return updated
}

export async function removeDocumentTypeFromVendorType(
  id: string,
  actorId: string,
  scope: AdminScopeContext,
) {
  const existing = await prisma.documentTypeVendorType.findUnique({
    where  : { id },
    include: { documentType: { select: { countryId: true } } },
  })
  if (!existing) throw new ApiError(404, "Requirement not found", "NOT_FOUND")
  assertCountryInScope(existing.documentType.countryId, scope)

  await prisma.documentTypeVendorType.delete({ where: { id } })

  serviceLog.warn({ id, actorId }, "Document type removed from vendor type")
  auditService.log({
    adminUserId: actorId,
    action     : "document_type_vendor_type.removed",
    entityType : "DocumentTypeVendorType",
    entityId   : id,
    changes    : { before: { documentTypeId: existing.documentTypeId, vendorTypeId: existing.vendorTypeId } },
  })

  return { success: true }
}

/*
 * "Given country X and vendor type Y, what documents must this vendor
 * provide" — reuses vendor.document.service.ts's getAllowedDocumentTypes,
 * the same function the live vendor onboarding flow already calls. This
 * is deliberately NOT reimplemented here — one query, one source of truth,
 * consumed by both the vendor-facing and admin-facing sides.
 */
export async function getRequirementsForCountryAndVendorType(
  countryId: string,
  vendorTypeId: string,
  scope: AdminScopeContext,
) {
  assertCountryInScope(countryId, scope)
  return getAllowedDocumentTypes({ countryId, vendorTypeId })
}
