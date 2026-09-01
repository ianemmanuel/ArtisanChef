import { prisma, DocumentStatus } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/middleware/error"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"
import { R2Service } from "@/lib/r2"
import { SYSTEM_USER_ID } from "@/constants/system"
import { getOutletDocumentRequirements } from "@/modules/vendor/services/vendor.document.service"
import { recomputeOutletClearance } from "@/modules/vendor/services/vendor.outletDocument.service"
import { notifyVendorOutletCompliance } from "./admin.outlet.notification.service"

const serviceLog = logger.child({ module: "admin-outlet-document-service" })

type ActionStatus =
  | "MISSING" | "NOT_UPLOADED" | "PENDING_REVIEW" | "APPROVED" | "EXPIRING_SOON" | "EXPIRED" | "REJECTED"

async function loadOutletInScope(outletId: string, scope: AdminScopeContext) {
  const outlet = await prisma.outlet.findUnique({
    where : { id: outletId },
    select: {
      id: true, cityId: true, name: true, deletedAt: true,
      vendor: { select: { id: true, countryId: true, vendorTypeId: true, legalBusinessName: true } },
    },
  })
  if (!outlet || outlet.deletedAt) throw new ApiError(404, "Outlet not found", "NOT_FOUND")
  if (!scope.isGlobal && !scope.countryIds.includes(outlet.vendor.countryId)) {
    throw new ApiError(403, "This outlet is outside your scope", "SCOPE_FORBIDDEN")
  }
  return outlet
}

async function loadDocInScope(documentId: string, scope: AdminScopeContext) {
  const doc = await prisma.outletDocument.findUnique({
    where  : { id: documentId },
    include: {
      documentType: { select: { name: true, complianceSeverity: true } },
      outlet: {
        select: {
          id: true, name: true, vendorId: true, cityId: true, adminStatus: true,
          vendor: { select: { countryId: true, legalBusinessName: true, businessEmail: true } },
        },
      },
    },
  })
  if (!doc) throw new ApiError(404, "Document not found", "NOT_FOUND")
  if (!scope.isGlobal && !scope.countryIds.includes(doc.outlet.vendor.countryId)) {
    throw new ApiError(403, "This document is outside your scope", "SCOPE_FORBIDDEN")
  }
  return doc
}

function severityOf(s: string): "LOW" | "MEDIUM" | "CRITICAL" {
  return s === "CRITICAL" ? "CRITICAL" : s === "LOW" ? "LOW" : "MEDIUM"
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getOutletDocumentsForAdmin(
  outletId: string,
  scope   : AdminScopeContext,
) {
  const outlet = await loadOutletInScope(outletId, scope)

  const [requirements, currentDocs] = await Promise.all([
    getOutletDocumentRequirements({
      countryId: outlet.vendor.countryId, vendorTypeId: outlet.vendor.vendorTypeId, cityId: outlet.cityId,
    }),
    prisma.outletDocument.findMany({ where: { outletId, supersededAt: null } }),
  ])
  const byType = new Map(currentDocs.map((d) => [d.documentTypeId, d]))
  const now = new Date()

  return requirements.map((type) => {
    const isRequired = type.vendorTypeConfigs[0]?.isRequired ?? type.isRequired
    const doc = byType.get(type.id) ?? null

    let actionStatus: ActionStatus
    if (!doc || doc.status === DocumentStatus.WITHDRAWN) {
      actionStatus = isRequired ? "MISSING" : "NOT_UPLOADED"
    } else if (doc.status === DocumentStatus.REJECTED) actionStatus = "REJECTED"
    else if (doc.status === DocumentStatus.EXPIRED) actionStatus = "EXPIRED"
    else if (doc.status === DocumentStatus.PENDING) actionStatus = "PENDING_REVIEW"
    else if (doc.expiryDate && doc.expiryDate < now) actionStatus = "EXPIRED"
    else if (doc.expiryDate && (doc.expiryDate.getTime() - now.getTime()) < type.expiryWarningDays * 86_400_000) actionStatus = "EXPIRING_SOON"
    else actionStatus = "APPROVED"

    return {
      documentTypeId  : type.id,
      documentTypeName: type.name,
      isRequired,
      requiresExpiry  : type.requiresExpiry,
      severity        : severityOf(type.complianceSeverity),
      actionStatus,
      currentDocument : doc ? {
        id             : doc.id,
        documentTypeId : doc.documentTypeId,
        status         : doc.status,
        documentName   : doc.documentName,
        mimeType       : doc.mimeType,
        issueDate      : doc.issueDate?.toISOString() ?? null,
        expiryDate     : doc.expiryDate?.toISOString() ?? null,
        rejectionReason: doc.rejectionReason,
        revisionNotes  : doc.revisionNotes,
        version        : doc.version,
        submittedAt    : doc.submittedAt.toISOString(),
        reviewedAt     : doc.reviewedAt?.toISOString() ?? null,
      } : null,
    }
  })
}

export async function getOutletDocumentSignedUrlForAdmin(documentId: string, scope: AdminScopeContext) {
  const doc = await loadDocInScope(documentId, scope)
  return { url: await R2Service.generateViewUrl(doc.storageKey) }
}

// ─── Review ──────────────────────────────────────────────────────────────────

export async function approveOutletDocument(documentId: string, actorId: string, scope: AdminScopeContext) {
  const doc = await loadDocInScope(documentId, scope)
  if (doc.status === DocumentStatus.APPROVED) throw new ApiError(400, "Document is already approved", "ALREADY_APPROVED")

  const now = new Date()
  const updated = await prisma.outletDocument.update({
    where: { id: documentId },
    data : { status: DocumentStatus.APPROVED, approvedAt: now, reviewedAt: now, rejectionReason: null, revisionNotes: null },
  })

  const clearance = await recomputeOutletClearance(doc.outletId)

  // Auto-lift a compliance suspension: if this outlet was taken offline for
  // an expired CRITICAL document and every CRITICAL document is now good
  // again, put it back to ACTIVE.
  if (doc.outlet.adminStatus === "SUSPENDED_COMPLIANCE" && clearance === "CLEARED") {
    await prisma.outlet.update({
      where: { id: doc.outletId },
      data : { adminStatus: "ACTIVE", adminSuspendedAt: null, adminSuspendUntil: null, adminSuspensionReason: null },
    })
    auditService.log({
      adminUserId: SYSTEM_USER_ID,
      action     : "outlet.compliance_suspension_lifted",
      entityType : "Outlet",
      entityId   : doc.outletId,
      changes    : { before: { adminStatus: "SUSPENDED_COMPLIANCE" }, after: { adminStatus: "ACTIVE" } },
      metadata   : { triggeredBy: "outlet_document.approved", documentId },
    })
    void notifyVendorOutletCompliance("RESOLVED", {
      outletId: doc.outletId, outletName: doc.outlet.name, vendorId: doc.outlet.vendorId,
      vendorEmail: doc.outlet.vendor.businessEmail, countryId: doc.outlet.vendor.countryId,
      cityId: doc.outlet.cityId, documentTypeName: doc.documentType.name,
      severity: doc.documentType.complianceSeverity,
    })
  }

  serviceLog.info({ documentId, outletId: doc.outletId, actorId, clearance }, "Outlet document approved")
  auditService.log({
    adminUserId: actorId,
    action     : "outlet_document.approved",
    entityType : "OutletDocument",
    entityId   : documentId,
    changes    : { before: { status: doc.status }, after: { status: "APPROVED" } },
    metadata   : { outletId: doc.outletId },
  })

  await prisma.vendorNotification.create({
    data: {
      vendorId: doc.outlet.vendorId,
      type    : "OUTLET_DOCUMENT_APPROVED",
      title   : `Document approved for ${doc.outlet.name}`,
      message : `${doc.documentType.name} for your outlet "${doc.outlet.name}" has been approved.`,
      metadata: { outletId: doc.outletId, documentTypeId: doc.documentTypeId },
    },
  }).catch((err) => serviceLog.error({ err, documentId }, "Approve notification failed"))

  return updated
}

export async function rejectOutletDocument(
  documentId    : string,
  rejectionReason: string,
  revisionNotes  : string | undefined,
  actorId        : string,
  scope          : AdminScopeContext,
) {
  if (!rejectionReason?.trim()) throw new ApiError(400, "A reason is required", "REASON_REQUIRED")

  const doc = await loadDocInScope(documentId, scope)
  if (doc.status === DocumentStatus.REJECTED) throw new ApiError(400, "Document is already rejected", "ALREADY_REJECTED")

  const now = new Date()
  const updated = await prisma.outletDocument.update({
    where: { id: documentId },
    data : {
      status: DocumentStatus.REJECTED, rejectedAt: now, reviewedAt: now, approvedAt: null,
      rejectionReason: rejectionReason.trim(), revisionNotes: revisionNotes?.trim() || null,
    },
  })

  await recomputeOutletClearance(doc.outletId)

  serviceLog.warn({ documentId, outletId: doc.outletId, actorId }, "Outlet document sent back for revision")
  auditService.log({
    adminUserId: actorId,
    action     : "outlet_document.rejected",
    entityType : "OutletDocument",
    entityId   : documentId,
    changes    : { before: { status: doc.status }, after: { status: "REJECTED" } },
    metadata   : { outletId: doc.outletId, reason: rejectionReason.trim() },
  })

  await prisma.vendorNotification.create({
    data: {
      vendorId: doc.outlet.vendorId,
      type    : "OUTLET_DOCUMENT_REJECTED",
      title   : `Document needs changes — ${doc.outlet.name}`,
      message : `${doc.documentType.name} for your outlet "${doc.outlet.name}" was sent back: ${revisionNotes?.trim() || rejectionReason.trim()}`,
      metadata: { outletId: doc.outletId, documentTypeId: doc.documentTypeId },
    },
  }).catch((err) => serviceLog.error({ err, documentId }, "Reject notification failed"))

  return updated
}
