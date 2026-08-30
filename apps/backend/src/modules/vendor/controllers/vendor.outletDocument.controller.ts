import { Request, Response, NextFunction } from "express"
import { getVendorAccount } from "@/helpers/auth/vendorAuth"
import { ApiError } from "@/middleware/error"
import { sendSuccess } from "@/helpers/api-response/response"
import {
  getOutletDocumentStatus,
  presignOutletDocumentUpload,
  upsertOutletDocument,
  getOutletDocumentViewUrl,
} from "../services/vendor.outletDocument.service"
import { listOutletInspectionsForVendor } from "../services/vendor.outlet.service"

export const handleGetOutletInspections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)
    const { id } = req.params as { id: string }
    const rows = await listOutletInspectionsForVendor(auth.vendorAccount.id, id)
    return sendSuccess(res, rows, "Outlet inspections fetched")
  } catch (err) { next(err) }
}

export const handleGetOutletDocumentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)
    const { id } = req.params as { id: string }
    const rows = await getOutletDocumentStatus(auth.vendorAccount.id, id)
    return sendSuccess(res, rows, "Outlet document status fetched")
  } catch (err) { next(err) }
}

export const handlePresignOutletDocumentUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)
    const { id } = req.params as { id: string }
    const { fileName, mimeType, fileType, documentTypeId } = req.body
    const resolvedType = mimeType || fileType
    if (!fileName || !resolvedType || !documentTypeId) {
      throw new ApiError(400, "fileName, fileType, and documentTypeId are required", "MISSING_FIELDS")
    }
    const result = await presignOutletDocumentUpload(auth.vendorAccount.id, id, { fileName, mimeType: resolvedType, documentTypeId })
    return sendSuccess(res, result, "Upload URL generated")
  } catch (err) { next(err) }
}

export const handleUpsertOutletDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)
    const { id } = req.params as { id: string }
    const { documentTypeId, storageKey, documentName, fileSize, mimeType, documentNumber, issueDate, expiryDate } = req.body
    if (!documentTypeId || !storageKey) {
      throw new ApiError(400, "documentTypeId and storageKey are required", "MISSING_FIELDS")
    }
    const doc = await upsertOutletDocument(auth.vendorAccount.id, id, {
      documentTypeId, storageKey, documentName, fileSize, mimeType, documentNumber, issueDate, expiryDate,
    })
    return sendSuccess(res, doc, "Document submitted for review", 201)
  } catch (err) { next(err) }
}

export const handleGetOutletDocumentPreview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)
    const { id, documentId } = req.params as { id: string; documentId: string }
    const result = await getOutletDocumentViewUrl(auth.vendorAccount.id, id, documentId)
    return sendSuccess(res, result, "Preview URL generated")
  } catch (err) { next(err) }
}
