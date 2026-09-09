import type { RequestHandler } from "express"
import { DocumentTypeStatus, type DocumentScope } from "@repo/db"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { ApiError } from "@/middleware/error"
import {
  listDocumentTypesForCountry,
  getDocumentType,
  createDocumentType,
  updateDocumentType,
  setDocumentTypeStatus,
  setDocumentTypeScope,
  assignDocumentTypeToVendorType,
  updateDocumentTypeVendorTypeRequirement,
  removeDocumentTypeFromVendorType,
  getRequirementsForCountryAndVendorType,
} from "../services/admin.documentType.service"

export const handleListDocumentTypesForCountry: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { countryId, page, pageSize, search, isRequired, scope: docScope, status } = req.query as {
      countryId?: string; page?: string; pageSize?: string; search?: string
      isRequired?: string; scope?: DocumentScope; status?: "ACTIVE" | "INACTIVE" | "DEPRECATED" | "ARCHIVED"
    }

    if (!countryId?.trim()) throw new ApiError(400, "countryId is required", "MISSING_FIELDS")

    const data = await listDocumentTypesForCountry(countryId, adminScope, {
      page      : page ? Number(page) : undefined,
      pageSize  : pageSize ? Number(pageSize) : undefined,
      search,
      isRequired: isRequired === undefined ? undefined : isRequired === "true",
      docScope,
      status,
    })
    return sendSuccess(res, data, "Document types fetched")
  } catch (err) { next(err) }
}

export const handleGetDocumentType: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { documentTypeId } = req.params as { documentTypeId: string }
    const data = await getDocumentType(documentTypeId, adminScope)
    return sendSuccess(res, data, "Document type fetched")
  } catch (err) { next(err) }
}

export const handleCreateDocumentType: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const {
      name, description, scope, countryId, cityId,
      isRequired, requiresExpiry, expiryWarningDays, instructions, sampleUrl,
      complianceSeverity, gracePeriodDays, enforcedFrom,
    } = req.body as {
      name?: string; description?: string
      scope?: DocumentScope; countryId?: string; cityId?: string
      isRequired?: boolean; requiresExpiry?: boolean; expiryWarningDays?: number
      instructions?: string; sampleUrl?: string
      complianceSeverity?: "LOW" | "MEDIUM" | "CRITICAL"; gracePeriodDays?: number; enforcedFrom?: string
    }

    if (!name?.trim())      throw new ApiError(400, "name is required", "MISSING_FIELDS")
    if (!countryId?.trim()) throw new ApiError(400, "countryId is required", "MISSING_FIELDS")
    if (scope !== "VENDOR" && scope !== "OUTLET" && scope !== "CITY") {
      throw new ApiError(400, "scope must be 'VENDOR', 'OUTLET', or 'CITY'", "INVALID_SCOPE")
    }

    const data = await createDocumentType(
      { name, description, scope, countryId, cityId, isRequired, requiresExpiry, expiryWarningDays, instructions, sampleUrl, complianceSeverity, gracePeriodDays, enforcedFrom },
      adminUser.id,
      adminScope,
    )
    return sendSuccess(res, data, "Document type created", 201)
  } catch (err) { next(err) }
}

export const handleUpdateDocumentType: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { documentTypeId } = req.params as { documentTypeId: string }
    const {
      name, description, scope: docScope, cityId, isRequired, requiresExpiry, expiryWarningDays, instructions, sampleUrl,
      complianceSeverity, gracePeriodDays, enforcedFrom,
    } = req.body as {
      name?: string; description?: string
      scope?: DocumentScope; cityId?: string
      isRequired?: boolean; requiresExpiry?: boolean; expiryWarningDays?: number; instructions?: string; sampleUrl?: string
      complianceSeverity?: "LOW" | "MEDIUM" | "CRITICAL"; gracePeriodDays?: number; enforcedFrom?: string
    }

    const data = await updateDocumentType(
      documentTypeId,
      { name, description, scope: docScope, cityId, isRequired, requiresExpiry, expiryWarningDays, instructions, sampleUrl, complianceSeverity, gracePeriodDays, enforcedFrom },
      adminUser.id,
      adminScope,
    )
    return sendSuccess(res, data, "Document type updated")
  } catch (err) { next(err) }
}

export const handleActivateDocumentType: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { documentTypeId } = req.params as { documentTypeId: string }
    const data = await setDocumentTypeStatus(documentTypeId, DocumentTypeStatus.ACTIVE, adminUser.id, adminScope)
    return sendSuccess(res, data, "Document type activated")
  } catch (err) { next(err) }
}

export const handleDeactivateDocumentType: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { documentTypeId } = req.params as { documentTypeId: string }
    const { reason } = req.body as { reason?: string }
    const data = await setDocumentTypeStatus(documentTypeId, DocumentTypeStatus.INACTIVE, adminUser.id, adminScope, reason)
    return sendSuccess(res, data, "Document type deactivated")
  } catch (err) { next(err) }
}

export const handleSetDocumentTypeScope: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { documentTypeId } = req.params as { documentTypeId: string }
    const { scope: docScope } = req.body as { scope?: "VENDOR" | "OUTLET" }

    if (docScope !== "VENDOR" && docScope !== "OUTLET") {
      throw new ApiError(400, "scope must be VENDOR or OUTLET", "MISSING_FIELDS")
    }

    const data = await setDocumentTypeScope(documentTypeId, docScope, adminUser.id, adminScope)
    return sendSuccess(res, data, "Document scope updated")
  } catch (err) { next(err) }
}

//* ─── Vendor type requirements ───────────────────────────────────────────

export const handleAssignDocumentTypeToVendorType: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { documentTypeId } = req.params as { documentTypeId: string }
    const { vendorTypeId, isRequired } = req.body as { vendorTypeId?: string; isRequired?: boolean }

    if (!vendorTypeId?.trim()) throw new ApiError(400, "vendorTypeId is required", "MISSING_FIELDS")

    const data = await assignDocumentTypeToVendorType(documentTypeId, vendorTypeId, isRequired, adminUser.id, adminScope)
    return sendSuccess(res, data, "Document type assigned to vendor type", 201)
  } catch (err) { next(err) }
}

export const handleUpdateDocumentTypeVendorTypeRequirement: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { requirementId } = req.params as { requirementId: string }
    const { isRequired } = req.body as { isRequired?: boolean }

    if (typeof isRequired !== "boolean") throw new ApiError(400, "isRequired must be a boolean", "MISSING_FIELDS")

    const data = await updateDocumentTypeVendorTypeRequirement(requirementId, isRequired, adminUser.id, adminScope)
    return sendSuccess(res, data, "Requirement updated")
  } catch (err) { next(err) }
}

export const handleRemoveDocumentTypeFromVendorType: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { requirementId } = req.params as { requirementId: string }

    const data = await removeDocumentTypeFromVendorType(requirementId, adminUser.id, adminScope)
    return sendSuccess(res, data, "Requirement removed")
  } catch (err) { next(err) }
}

export const handleGetRequirementsForCountryAndVendorType: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { countryId, vendorTypeId } = req.query as { countryId?: string; vendorTypeId?: string }

    if (!countryId?.trim())    throw new ApiError(400, "countryId is required", "MISSING_FIELDS")
    if (!vendorTypeId?.trim()) throw new ApiError(400, "vendorTypeId is required", "MISSING_FIELDS")

    const data = await getRequirementsForCountryAndVendorType(countryId, vendorTypeId, adminScope)
    return sendSuccess(res, data, "Requirements fetched")
  } catch (err) { next(err) }
}
