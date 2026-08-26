import { prisma, DocumentStatus } from "@repo/db"
import { ApiError } from "@/errors/ApiError"
import path from "node:path"
import { R2Service } from "@/lib/r2"
import { getAllowedDocumentTypes } from "./vendor.document.service"

/*
 * Roadmap "Vendor document remediation" (CLAUDE.md, 2026-08-26) — the
 * vendor-facing counterpart to compliance detection/review. Deliberately
 * a separate file from vendor.document.service.ts: that file's
 * presign/upsert are application-scoped (ensureApplicationEditable,
 * in-place replace, no version history — "the vendor is still
 * assembling a DRAFT, there's nothing to audit yet"). This is the
 * opposite situation — an ACTIVE vendor renewing/fixing a document
 * against their live account, where every version matters for
 * compliance/audit — so every replace here creates a NEW VendorDocument
 * row and marks the old one superseded (supersededBy/supersededAt/
 * version), never overwrites in place. This is exactly what those three
 * fields were reserved for (see the old upsertVendorDocument's comment).
 *
 * Reuses getAllowedDocumentTypes as-is (no vendor-account-specific
 * variant needed — it already only requires countryId/vendorTypeId, not
 * a full application object).
 */

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export type VendorDocumentActionStatus =
  | "MISSING"        // required, nothing uploaded
  | "NOT_UPLOADED"    // optional, nothing uploaded
  | "PENDING_REVIEW"
  | "APPROVED"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "REJECTED"

export interface VendorDocumentStatusRow {
  documentTypeId  : string
  documentTypeName: string
  isRequired      : boolean
  requiresExpiry  : boolean
  instructions    : string | null
  sampleUrl       : string | null
  actionStatus    : VendorDocumentActionStatus
  currentDocument : {
    id             : string
    documentTypeId : string
    status         : DocumentStatus
    documentName   : string | null
    mimeType       : string | null
    issueDate      : Date | null
    expiryDate     : Date | null
    rejectionReason: string | null
    revisionNotes  : string | null
    uploadedAt     : Date
    version        : number
  } | null
}

async function loadActiveVendor(vendorId: string) {
  const vendor = await prisma.vendorAccount.findUnique({
    where : { id: vendorId },
    select: { id: true, status: true, countryId: true, vendorTypeId: true, userId: true, deletedAt: true },
  })
  if (!vendor || vendor.deletedAt) throw new ApiError(404, "Vendor account not found", "NOT_FOUND")
  if (vendor.status !== "ACTIVE") throw new ApiError(403, "Your account is not active", "ACCOUNT_INACTIVE")
  return vendor
}

/*
 * "What am I missing right now" — the exact same live picture the admin
 * compliance system computes (MISSING/EXPIRED/EXPIRING_SOON detection),
 * from the vendor's own side. A newly-added DocumentTypeConfig
 * requirement shows up here automatically on the next load — there's no
 * separate "new requirement" concept to special-case, since this always
 * reflects what's currently required, not a snapshot from account
 * approval time.
 */
export async function getVendorAccountDocumentStatus(vendorId: string): Promise<VendorDocumentStatusRow[]> {
  const vendor = await loadActiveVendor(vendorId)

  const [allowedTypes, currentDocs] = await Promise.all([
    getAllowedDocumentTypes({ countryId: vendor.countryId, vendorTypeId: vendor.vendorTypeId }),
    prisma.vendorDocument.findMany({ where: { vendorId, supersededAt: null } }),
  ])
  const docByType = new Map(currentDocs.map((d) => [d.documentTypeId, d]))
  const now = new Date()

  return allowedTypes.map((type) => {
    const config = type.vendorTypeConfigs[0]
    const isRequired = config?.isRequired ?? type.isRequired
    const doc = docByType.get(type.id) ?? null

    let actionStatus: VendorDocumentActionStatus
    if (!doc || doc.status === DocumentStatus.WITHDRAWN) {
      actionStatus = isRequired ? "MISSING" : "NOT_UPLOADED"
    } else if (doc.status === DocumentStatus.REJECTED) {
      actionStatus = "REJECTED"
    } else if (doc.status === DocumentStatus.EXPIRED) {
      actionStatus = "EXPIRED"
    } else if (doc.status === DocumentStatus.PENDING) {
      actionStatus = "PENDING_REVIEW"
    } else if (doc.expiryDate && doc.expiryDate < now) {
      // Cron hasn't flipped it to EXPIRED yet — still true right now.
      actionStatus = "EXPIRED"
    } else if (doc.expiryDate && (doc.expiryDate.getTime() - now.getTime()) < type.expiryWarningDays * 86_400_000) {
      actionStatus = "EXPIRING_SOON"
    } else {
      actionStatus = "APPROVED"
    }

    return {
      documentTypeId: type.id, documentTypeName: type.name, isRequired,
      requiresExpiry: type.requiresExpiry, instructions: type.instructions, sampleUrl: type.sampleUrl,
      actionStatus,
      currentDocument: doc ? {
        id: doc.id, documentTypeId: doc.documentTypeId, status: doc.status,
        documentName: doc.documentName, mimeType: doc.mimeType,
        issueDate: doc.issueDate, expiryDate: doc.expiryDate,
        rejectionReason: doc.rejectionReason, revisionNotes: doc.revisionNotes,
        uploadedAt: doc.uploadedAt, version: doc.version,
      } : null,
    }
  })
}

interface PresignInput {
  fileName      : string
  mimeType      : string
  documentTypeId: string
}

export async function presignAccountDocumentUpload(vendorId: string, input: PresignInput) {
  if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
    throw new ApiError(400, "Unsupported file type", "UNSUPPORTED_FILE_TYPE")
  }
  const vendor = await loadActiveVendor(vendorId)

  const allowed = await getAllowedDocumentTypes({ countryId: vendor.countryId, vendorTypeId: vendor.vendorTypeId })
  if (!allowed.some((t) => t.id === input.documentTypeId)) {
    throw new ApiError(400, "Invalid document type for your account", "DOCUMENT_TYPE_INVALID")
  }

  const extension  = path.extname(input.fileName).replace(".", "")
  const storageKey = R2Service.generateStorageKey(vendor.userId ?? vendorId, input.documentTypeId, extension)
  const uploadUrl  = await R2Service.generateUploadUrl(storageKey, input.mimeType)

  return { uploadUrl, storageKey }
}

interface UpsertAccountDocumentInput {
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
 * Always creates a NEW row and supersedes any prior one — see the
 * file-level comment for why this differs from the application-time
 * upsertVendorDocument. Both writes happen in one transaction so a
 * mid-write failure can't leave two "current" (supersededAt: null)
 * documents for the same type.
 */
export async function upsertAccountDocument(vendorId: string, input: UpsertAccountDocumentInput) {
  if (input.mimeType && !ALLOWED_MIME_TYPES.includes(input.mimeType)) {
    throw new ApiError(400, "Unsupported file type", "UNSUPPORTED_FILE_TYPE")
  }
  if (typeof input.fileSize === "number" && input.fileSize > MAX_FILE_SIZE_BYTES) {
    throw new ApiError(400, "File exceeds the maximum allowed size", "FILE_TOO_LARGE")
  }

  const vendor = await loadActiveVendor(vendorId)
  const allowed = await getAllowedDocumentTypes({ countryId: vendor.countryId, vendorTypeId: vendor.vendorTypeId })
  if (!allowed.some((t) => t.id === input.documentTypeId)) {
    throw new ApiError(400, "Invalid document type for your account", "DOCUMENT_TYPE_INVALID")
  }

  const existingDoc = await prisma.vendorDocument.findFirst({
    where: { vendorId, documentTypeId: input.documentTypeId, supersededAt: null, status: { not: DocumentStatus.WITHDRAWN } },
  })

  const now = new Date()
  const [newDoc] = await prisma.$transaction([
    prisma.vendorDocument.create({
      data: {
        vendorId, documentTypeId: input.documentTypeId, storageKey: input.storageKey,
        documentName: input.documentName, fileSize: input.fileSize, mimeType: input.mimeType,
        documentNumber: input.documentNumber, issueDate: input.issueDate, expiryDate: input.expiryDate,
        status: DocumentStatus.PENDING, version: (existingDoc?.version ?? 0) + 1,
      },
    }),
    ...(existingDoc
      ? [prisma.vendorDocument.update({ where: { id: existingDoc.id }, data: { supersededAt: now } })]
      : []),
  ])

  // Second write to stamp supersededBy with the new row's id — can't be
  // done in the transaction above since the new id doesn't exist until
  // the create resolves. Best-effort-adjacent but not truly best-effort:
  // if this fails the old row is still correctly excluded from every
  // "current documents" query (supersededAt is already set), it just
  // loses the forward pointer to what replaced it.
  if (existingDoc) {
    await prisma.vendorDocument.update({ where: { id: existingDoc.id }, data: { supersededBy: newDoc.id } })
  }

  return newDoc
}
