import { Request, Response, NextFunction } from "express"
import { getVendorUser, getVendorApplication } from "@/helpers/auth/vendorAuth"
import { sendSuccess } from "@/helpers/api-response/response"
import { ApiError } from "@/errors/ApiError"
import {
  presignDocumentUpload,
  upsertVendorDocument,
  getDocumentRequirementsSummary,
  deleteVendorDocument,
  getVendorDocumentViewUrl,
} from "../services/vendor.document.service"

//* PRESIGN UPLOAD

export const handlePresignUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vendorUser, application } = await getVendorApplication(req)

    const { fileName, fileType, mimeType, documentTypeId } = req.body
    const resolvedType = fileType || mimeType

    if (!fileName || !resolvedType || !documentTypeId) {
      throw new ApiError(400, "Missing required fields", "MISSING_FIELDS")
    }

    const result = await presignDocumentUpload(vendorUser.id, application, {
      fileName,
      mimeType: resolvedType,
      documentTypeId,
    })

    return sendSuccess(res, result, "Upload URL generated")
  } catch (err) { next(err) }
}

//* UPSERT DOCUMENT (confirm an upload, or replace an existing one)

export const handleUpsertDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { application } = await getVendorApplication(req)

    const {
      documentTypeId, storageKey, documentName,
      fileSize, mimeType, documentNumber, issueDate, expiryDate,
    } = req.body

    if (!documentTypeId || !storageKey) {
      throw new ApiError(400, "Missing required document fields", "MISSING_FIELDS")
    }

    const { document, progress, replaced } = await upsertVendorDocument(application, {
      documentTypeId, storageKey, documentName,
      fileSize, mimeType, documentNumber, issueDate, expiryDate,
    })

    return sendSuccess(
      res,
      { document, progress },
      replaced ? "Document replaced successfully" : "Document uploaded successfully",
      replaced ? 200 : 201,
    )
  } catch (err) { next(err) }
}

//* GET DOCUMENT REQUIREMENTS + PROGRESS

export const handleGetApplicationDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { application } = await getVendorApplication(req)
    const result = await getDocumentRequirementsSummary(application)
    return sendSuccess(res, result, "Document requirements fetched successfully")
  } catch (err) { next(err) }
}

//* DELETE DOCUMENT — by document id, since a vendor has many documents

export const handleDeleteDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorUser = await getVendorUser(req)
    const { id } = req.params

    if (!id) throw new ApiError(400, "Document id is required", "MISSING_FIELDS")

    const progress = await deleteVendorDocument(vendorUser.id, id)

    return sendSuccess(res, { progress }, "Document deleted successfully")
  } catch (err) { next(err) }
}

//* PREVIEW DOCUMENT (signed view URL) — by document id

export const handlePreviewDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorUser = await getVendorUser(req)
    const { id } = req.params

    if (!id) throw new ApiError(400, "Document id is required", "MISSING_FIELDS")

    const url = await getVendorDocumentViewUrl(vendorUser.id, id)

    return sendSuccess(res, { url }, "Preview URL generated")
  } catch (err) { next(err) }
}