import { Request, Response, NextFunction } from "express"
import { getVendorAccount } from "@/helpers/auth/vendorAuth"
import { ApiError } from "@/errors/ApiError"
import { sendSuccess } from "@/helpers/api-response/response"
import {
  getVendorAccountDocumentStatus,
  presignAccountDocumentUpload,
  upsertAccountDocument,
} from "../services/vendor.accountDocument.service"

export const handleGetAccountDocumentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)
    const rows = await getVendorAccountDocumentStatus(auth.vendorAccount.id)
    return sendSuccess(res, rows, "Document status fetched")
  } catch (err) { next(err) }
}

export const handlePresignAccountDocumentUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)
    const { fileName, mimeType, fileType, documentTypeId } = req.body
    const resolvedType = mimeType || fileType

    if (!fileName || !resolvedType || !documentTypeId) {
      throw new ApiError(400, "Missing required fields", "MISSING_FIELDS")
    }

    const result = await presignAccountDocumentUpload(auth.vendorAccount.id, { fileName, mimeType: resolvedType, documentTypeId })
    return sendSuccess(res, result, "Upload URL generated")
  } catch (err) { next(err) }
}

export const handleUpsertAccountDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)
    const { documentTypeId, storageKey, documentName, fileSize, mimeType, documentNumber, issueDate, expiryDate } = req.body

    if (!documentTypeId || !storageKey) {
      throw new ApiError(400, "Missing required document fields", "MISSING_FIELDS")
    }

    const document = await upsertAccountDocument(auth.vendorAccount.id, {
      documentTypeId, storageKey, documentName, fileSize, mimeType, documentNumber, issueDate, expiryDate,
    })
    return sendSuccess(res, document, "Document submitted for review", 201)
  } catch (err) { next(err) }
}
