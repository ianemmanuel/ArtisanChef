import { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { ApiError } from "@/middleware/error"
import {
  getOutletDocumentsForAdmin,
  getOutletDocumentSignedUrlForAdmin,
  approveOutletDocument,
  rejectOutletDocument,
} from "../services/admin.outletDocument.service"

export const handleGetOutletDocuments: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { outletId } = req.params as { outletId: string }
    const rows = await getOutletDocumentsForAdmin(outletId, adminScope)
    return sendSuccess(res, rows, "Outlet documents fetched")
  } catch (err) { next(err) }
}

export const handleGetOutletDocumentSignedUrl: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { documentId } = req.params as { documentId: string }
    const result = await getOutletDocumentSignedUrlForAdmin(documentId, adminScope)
    return sendSuccess(res, result, "Signed URL generated")
  } catch (err) { next(err) }
}

export const handleApproveOutletDocument: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { documentId } = req.params as { documentId: string }
    const data = await approveOutletDocument(documentId, adminUser.id, adminScope)
    return sendSuccess(res, data, "Document approved")
  } catch (err) { next(err) }
}

export const handleRejectOutletDocument: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { documentId } = req.params as { documentId: string }
    const { rejectionReason, revisionNotes } = req.body
    if (!rejectionReason?.trim()) throw new ApiError(400, "rejectionReason is required", "MISSING_FIELDS")
    const data = await rejectOutletDocument(documentId, rejectionReason, revisionNotes, adminUser.id, adminScope)
    return sendSuccess(res, data, "Document sent back for revision")
  } catch (err) { next(err) }
}
