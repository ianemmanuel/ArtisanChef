import { prisma, GeoStatus, DocumentTypeStatus } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/middleware/error"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"
import { getAllowedDocumentTypes } from "@/modules/vendor/services/vendor.document.service"

const serviceLog = logger.child({ module: "admin-document-type-service" })

function assertCountryInScope(countryId: string, scope: AdminScopeContext): void {
  if (!scope.isGlobal && !scope.countryIds.includes(countryId)) {
    throw new ApiError(403, "This country is outside your scope", "SCOPE_FORBIDDEN")
  }
}

export async function listDocumentTypesForCountry(
  countryId: string,
  scope: AdminScopeContext,
  params: { page?: number; pageSize?: number; search?: string } = {},
) {
  assertCountryInScope(countryId, scope)

  const { page = 1, pageSize = 10, search } = params
  const skip = (page - 1) * pageSize
  const where = {
    countryId,
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
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
      },
      orderBy: { name: "asc" },
    }),
    prisma.documentTypeConfig.count({ where }),
  ])

  return { documentTypes, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getDocumentType(id: string, scope: AdminScopeContext) {
  const documentType = await prisma.documentTypeConfig.findUnique({
    where  : { id },
    include: {
      vendorTypeConfigs: {
        include: { vendorType: { select: { id: true, name: true } } },
      },
    },
  })

  if (!documentType) throw new ApiError(404, "Document type not found", "NOT_FOUND")
  assertCountryInScope(documentType.countryId, scope)

  return documentType
}

export async function createDocumentType(
  input: {
    name: string
    code: string
    description?: string
    scope: "VENDOR" | "OUTLET"
    countryId: string
    cityId?: string
    isRequired?: boolean
    requiresExpiry?: boolean
    expiryWarningDays?: number
    instructions?: string
    sampleUrl?: string
  },
  actorId: string,
  scope: AdminScopeContext,
) {
  assertCountryInScope(input.countryId, scope)

  const country = await prisma.country.findUnique({ where: { id: input.countryId } })
  if (!country) throw new ApiError(404, "Country not found", "NOT_FOUND")
  if (country.status !== GeoStatus.ACTIVE) {
    throw new ApiError(400, "Cannot add a document type to an inactive country", "COUNTRY_INACTIVE")
  }

  if (input.cityId) {
    const city = await prisma.city.findUnique({ where: { id: input.cityId } })
    if (!city) throw new ApiError(404, "City not found", "NOT_FOUND")
    if (city.countryId !== input.countryId) {
      throw new ApiError(400, "City does not belong to this country", "CITY_COUNTRY_MISMATCH")
    }
  }

  // findFirst, not findUnique — Prisma's compound-unique input type requires
  // a non-null cityId, but most document types are country-wide (cityId
  // null) by design. The @@unique([code, countryId, cityId]) DB constraint
  // is still the actual guarantee; this is just the friendly pre-check.
  const duplicate = await prisma.documentTypeConfig.findFirst({
    where: { code: input.code, countryId: input.countryId, cityId: input.cityId ?? null },
  })
  if (duplicate) {
    throw new ApiError(409, "A document type with this code already exists for this country/city", "DUPLICATE_DOCUMENT_TYPE")
  }

  const documentType = await prisma.documentTypeConfig.create({
    data: {
      name             : input.name,
      code             : input.code,
      description      : input.description ?? null,
      scope            : input.scope,
      countryId        : input.countryId,
      cityId           : input.cityId ?? null,
      isRequired       : input.isRequired ?? true,
      requiresExpiry   : input.requiresExpiry ?? true,
      expiryWarningDays: input.expiryWarningDays ?? 30,
      instructions     : input.instructions ?? null,
      sampleUrl        : input.sampleUrl ?? null,
      createdByAdminId : actorId,
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
    isRequired?: boolean
    requiresExpiry?: boolean
    expiryWarningDays?: number
    instructions?: string
    sampleUrl?: string
  },
  actorId: string,
  scope: AdminScopeContext,
) {
  const existing = await prisma.documentTypeConfig.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, "Document type not found", "NOT_FOUND")
  assertCountryInScope(existing.countryId, scope)

  const updated = await prisma.documentTypeConfig.update({
    where: { id },
    data : {
      ...(input.name != null ? { name: input.name } : {}),
      ...(input.description != null ? { description: input.description } : {}),
      ...(input.isRequired != null ? { isRequired: input.isRequired } : {}),
      ...(input.requiresExpiry != null ? { requiresExpiry: input.requiresExpiry } : {}),
      ...(input.expiryWarningDays != null ? { expiryWarningDays: input.expiryWarningDays } : {}),
      ...(input.instructions != null ? { instructions: input.instructions } : {}),
      ...(input.sampleUrl != null ? { sampleUrl: input.sampleUrl } : {}),
    },
  })

  serviceLog.info({ documentTypeId: id, actorId }, "Document type updated")
  auditService.log({
    adminUserId: actorId,
    action     : "document_type.updated",
    entityType : "DocumentTypeConfig",
    entityId   : id,
    changes    : { before: { name: existing.name }, after: { name: updated.name } },
  })

  return updated
}

export async function setDocumentTypeStatus(
  id: string,
  status: (typeof DocumentTypeStatus)[keyof typeof DocumentTypeStatus],
  actorId: string,
  scope: AdminScopeContext,
) {
  const existing = await prisma.documentTypeConfig.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, "Document type not found", "NOT_FOUND")
  assertCountryInScope(existing.countryId, scope)

  if (existing.status === status) {
    throw new ApiError(400, `Document type is already ${status.toLowerCase()}`, "NO_CHANGE")
  }

  await prisma.documentTypeConfig.update({ where: { id }, data: { status } })

  serviceLog.info({ documentTypeId: id, actorId, status }, "Document type status changed")
  auditService.log({
    adminUserId: actorId,
    action     : "document_type.status_changed",
    entityType : "DocumentTypeConfig",
    entityId   : id,
    changes    : { before: { status: existing.status }, after: { status } },
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
