import { prisma, DocumentTypeStatus, DocumentStatus } from "@repo/db"
import { ApiError } from "@/errors/ApiError"
import path from "node:path"
import { R2Service } from "@/lib/r2"
import { ensureApplicationEditable } from "./vendor.application.guards"
import type { VendorApplication, VendorApplicationStatus } from "@repo/db"

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB — adjust to your actual requirement docs

interface PresignInput {
  fileName      : string
  mimeType      : string
  documentTypeId: string
}


interface UpsertDocumentInput {
  documentTypeId : string
  storageKey     : string
  documentName?  : string
  fileSize?      : number
  mimeType?      : string
  documentNumber?: string
  issueDate?     : string | Date
  expiryDate?    : string | Date
}


/*
 * Requirements + progress — what documents an application needs and
 * how far along it is. Fully independent of how a file actually gets
 * into R2, so this half of the old VendorDocumentService/
 * DocumentRequirementService split converts cleanly to flat exports
 * now. presignUpload/upsertDocument stay where they are pending the
 * upload-mechanism decision (see chat).
*/

/*
 * A document with NO DocumentTypeVendorType links applies to every vendor
 * type in its country by default — an admin only needs to link specific
 * vendor types when a document should be RESTRICTED to just those (e.g.
 * a baking certificate only for bakeries). Linking is an allowlist, not
 * an opt-in requirement.
 */
export async function getAllowedDocumentTypes(application: {
  countryId   : string
  vendorTypeId: string
}) {
  return prisma.documentTypeConfig.findMany({
    where: {
      countryId: application.countryId,
      scope    : "VENDOR",
      status   : DocumentTypeStatus.ACTIVE,
      OR: [
        { vendorTypeConfigs: { none: {} } },
        { vendorTypeConfigs: { some: { vendorTypeId: application.vendorTypeId } } },
      ],
    },
    include: {
      vendorTypeConfigs: {
        where : { vendorTypeId: application.vendorTypeId },
        select: { isRequired: true },
      },
    },
  })
}

/*
 * OUTLET-scoped requirement resolution — the per-physical-location
 * counterpart to getAllowedDocumentTypes (which is VENDOR scope only). Same
 * vendor-type allowlist rule ("no DocumentTypeVendorType links = applies to
 * every vendor type"). An OUTLET-scoped type may optionally be pinned to one
 * city (cityId) — a type with cityId set only applies to outlets in that
 * city. CITY-scoped types are a different mechanism (once-per-vendor-per-city
 * via OutletDocumentInheritance) and are deliberately NOT included here.
 */
export async function getOutletDocumentRequirements(outlet: {
  countryId   : string
  vendorTypeId: string
  cityId      : string
}) {
  return prisma.documentTypeConfig.findMany({
    where: {
      countryId: outlet.countryId,
      scope    : "OUTLET",
      status   : DocumentTypeStatus.ACTIVE,
      AND: [
        { OR: [{ cityId: null }, { cityId: outlet.cityId }] },
        {
          OR: [
            { vendorTypeConfigs: { none: {} } },
            { vendorTypeConfigs: { some: { vendorTypeId: outlet.vendorTypeId } } },
          ],
        },
      ],
    },
    include: {
      vendorTypeConfigs: {
        where : { vendorTypeId: outlet.vendorTypeId },
        select: { isRequired: true },
      },
    },
  })
}

export async function assertDocumentTypeAllowed(
  application: { id: string; countryId: string; vendorTypeId: string },
  documentTypeId: string,
): Promise<void> {
  const allowed = await getAllowedDocumentTypes(application)
  const match   = allowed.find((type) => type.id === documentTypeId)

  if (!match) {
    throw new ApiError(400, "Invalid document type for this application", "DOCUMENT_TYPE_INVALID")
  }
}

export async function getRequirementsWithStatus(application: {
  id          : string
  countryId   : string
  vendorTypeId: string
}) {
  const [allowedTypes, uploadedDocs] = await Promise.all([
    getAllowedDocumentTypes(application),
    prisma.vendorDocument.findMany({
      where: {
        applicationId: application.id,
        status       : { in: [DocumentStatus.PENDING, DocumentStatus.APPROVED] },
      },
    }),
  ])

  const uploadedMap = new Map(uploadedDocs.map((doc) => [doc.documentTypeId, doc]))

  return allowedTypes.map((type) => {
    const config   = type.vendorTypeConfigs[0]
    const uploaded = uploadedMap.get(type.id)

    return {
      documentTypeId  : type.id,
      name            : type.name,
      // No vendor-type-specific override (applies to all) falls back to
      // the document's own isRequired — see getAllowedDocumentTypes.
      isRequired      : config?.isRequired ?? type.isRequired,
      uploaded        : !!uploaded,
      uploadedDocument: uploaded ?? null,
    }
  })
}

export async function getUploadProgress(application: {
  id          : string
  countryId   : string
  vendorTypeId: string
}) {
  const requirements     = await getRequirementsWithStatus(application)
  const required         = requirements.filter((r) => r.isRequired)
  const uploadedRequired = required.filter((r) => r.uploaded)

  return {
    requiredTotal   : required.length,
    uploadedRequired: uploadedRequired.length,
    uploadedTotal   : requirements.filter((r) => r.uploaded).length,
    isComplete      : uploadedRequired.length === required.length,
    percentage:
      required.length === 0
        ? 100
        : Math.round((uploadedRequired.length / required.length) * 100),
  }
}

/*
 * Throws with the specific missing document names — used by submit.
 * Deliberately replaces a bare "progress < 100%" check with a message
 * that actually names what's missing.
 */
export async function assertDocumentsReadyForSubmission(application: {
  id          : string
  countryId   : string
  vendorTypeId: string
}): Promise<void> {
  const requirements = await getRequirementsWithStatus(application)
  const missing = requirements.filter((r) => r.isRequired && !r.uploaded)

  if (missing.length > 0) {
    throw new ApiError(
      400,
      `Missing required documents: ${missing.map((d) => d.name).join(", ")}`,
      "MISSING_REQUIRED_DOCUMENTS",
    )
  }
}

/*
 * Every required document type must have an uploaded document whose
 * status is specifically APPROVED — not merely uploaded/pending.
 * Used by admin's application approval gate.
 */
export async function assertAllRequiredDocumentsApproved(application: {
  id          : string
  countryId   : string
  vendorTypeId: string
}): Promise<void> {
  const requirements = await getRequirementsWithStatus(application)
  const notApproved = requirements.filter(
    (r) => r.isRequired && r.uploadedDocument?.status !== DocumentStatus.APPROVED,
  )

  if (notApproved.length > 0) {
    throw new ApiError(
      400,
      `Cannot approve — these required documents are not yet approved: ${notApproved.map((d) => d.name).join(", ")}`,
      "DOCUMENTS_NOT_APPROVED",
    )
  }
}


export async function presignDocumentUpload(
  vendorUserId: string,
  application : { id: string; countryId: string; vendorTypeId: string; status: VendorApplicationStatus },
  input       : PresignInput,
) {
  if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
    throw new ApiError(400, "Unsupported file type", "UNSUPPORTED_FILE_TYPE")
  }

  ensureApplicationEditable(application.status)
  await assertDocumentTypeAllowed(application, input.documentTypeId)

  const extension  = path.extname(input.fileName).replace(".", "")
  // Keyed by vendorUserId, not applicationId — the document outlives
  // the application once approved and transferred to VendorAccount,
  // so the storage path shouldn't reference something ephemeral.
  const storageKey = R2Service.generateStorageKey(vendorUserId, input.documentTypeId, extension)
  const uploadUrl  = await R2Service.generateUploadUrl(storageKey, input.mimeType)

  return { uploadUrl, storageKey }
}

/*
 * Confirms an upload, or replaces an existing document for the same
 * (application, documentType) pair. Pre-submission this is a
 * straight in-place update — the vendor is still assembling a DRAFT,
 * there's nothing to audit yet. supersededBy/version are for
 * post-approval document renewal, not this flow.
 */
export async function upsertVendorDocument(application: VendorApplication, input: UpsertDocumentInput) {
  if (input.mimeType && !ALLOWED_MIME_TYPES.includes(input.mimeType)) {
    throw new ApiError(400, "Unsupported file type", "UNSUPPORTED_FILE_TYPE")
  }
  if (typeof input.fileSize === "number" && input.fileSize > MAX_FILE_SIZE_BYTES) {
    throw new ApiError(400, "File exceeds the maximum allowed size", "FILE_TOO_LARGE")
  }

  ensureApplicationEditable(application.status)
  await assertDocumentTypeAllowed(application, input.documentTypeId)

  const existingDoc = await prisma.vendorDocument.findFirst({
    where: {
      applicationId : application.id,
      documentTypeId: input.documentTypeId,
      supersededAt  : null,
      status        : { not: DocumentStatus.WITHDRAWN },
    },
  })

  let document
  if (existingDoc) {
    // Old R2 object must be removed on replace, or every replace
    // leaks an orphaned object in the bucket forever.
    await R2Service.deleteObject(existingDoc.storageKey).catch(() => {
      // best-effort — a storage hiccup shouldn't block the replace
    })

    document = await prisma.vendorDocument.update({
      where: { id: existingDoc.id },
      data : {
        storageKey     : input.storageKey,
        documentName   : input.documentName,
        fileSize       : input.fileSize,
        mimeType       : input.mimeType,
        documentNumber : input.documentNumber,
        issueDate      : input.issueDate,
        expiryDate     : input.expiryDate,
        status         : DocumentStatus.PENDING,
        reviewedAt     : null,
        approvedAt     : null,
        rejectedAt     : null,
        rejectionReason: null,
        revisionNotes  : null,
      },
    })
  } else {
    document = await prisma.vendorDocument.create({
      data: {
        applicationId : application.id,
        documentTypeId: input.documentTypeId,
        storageKey    : input.storageKey,
        documentName  : input.documentName,
        fileSize      : input.fileSize,
        mimeType      : input.mimeType,
        documentNumber: input.documentNumber,
        issueDate     : input.issueDate,
        expiryDate    : input.expiryDate,
        status        : DocumentStatus.PENDING,
      },
    })
  }

  const progress = await getUploadProgress(application)

  return { document, progress, replaced: !!existingDoc }
}

/** Combined requirements + progress for the document checklist UI. */
export async function getDocumentRequirementsSummary(application: {
  id          : string
  status      : VendorApplicationStatus
  countryId   : string
  vendorTypeId: string
}) {
  const [requirements, progress] = await Promise.all([
    getRequirementsWithStatus(application),
    getUploadProgress(application),
  ])

  return {
    application: {
      id          : application.id,
      status      : application.status,
      countryId   : application.countryId,
      vendorTypeId: application.vendorTypeId,
    },
    requirements,
    progress,
  }
}

export async function deleteVendorDocument(vendorUserId: string, documentId: string) {
  const document = await prisma.vendorDocument.findUnique({
    where  : { id: documentId },
    include: { application: true },
  })

  if (!document || !document.application) {
    throw new ApiError(404, "Document not found", "DOCUMENT_NOT_FOUND")
  }
  if (document.application.userId !== vendorUserId) {
    throw new ApiError(403, "Unauthorized", "FORBIDDEN")
  }

  ensureApplicationEditable(document.application.status)

  await R2Service.deleteObject(document.storageKey)
  await prisma.vendorDocument.delete({ where: { id: documentId } })

  return getUploadProgress(document.application)
}

/*
 * Shared by both application-time documents (applicationId set) and
 * account-level ones (vendorId set — see vendor.accountDocument.service.ts)
 * — same preview endpoint, ownership just resolves through whichever
 * parent the document actually has.
 */
export async function getVendorDocumentViewUrl(vendorUserId: string, documentId: string) {
  const document = await prisma.vendorDocument.findUnique({
    where  : { id: documentId },
    include: { application: { select: { userId: true } }, vendor: { select: { userId: true } } },
  })

  if (!document || (!document.application && !document.vendor)) {
    throw new ApiError(404, "Document not found", "DOCUMENT_NOT_FOUND")
  }
  const owns = document.application?.userId === vendorUserId || document.vendor?.userId === vendorUserId
  if (!owns) {
    throw new ApiError(403, "Unauthorized", "FORBIDDEN")
  }

  return R2Service.generateViewUrl(document.storageKey)
}