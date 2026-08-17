import { Request, Response, NextFunction } from "express"
import { getVendorUser, getVendorApplication } from "@/helpers/auth/vendorAuth"
import { sendSuccess } from "@/helpers/api-response/response"
import {
  getApplication,
  createApplication,
  updateApplication,
  previewApplication,
  submitApplication,
  changeApplicationScope,
} from "../services/vendor.application.service"
import {
  createApplicationSchema,
  updateApplicationSchema,
  changeApplicationScopeSchema,
} from "../schemas/vendor.application.schema"

//* GET vendor application (full, with country/vendorType/documents)

export const handleGetApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorUser = await getVendorUser(req)
    const application = await getApplication(vendorUser.id)
    return sendSuccess(res, application, "Application fetched successfully")
  } catch (err) { next(err) }
}

//* CREATE vendor application (draft)

export const handleCreateApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorUser = await getVendorUser(req)
    const input = createApplicationSchema.parse(req.body)
    const { application, created } = await createApplication(vendorUser, input)

    return sendSuccess(
      res,
      application,
      created ? "Application started" : "Application already exists",
      created ? 201 : 200,
    )
  } catch (err) { next(err) }
}

//* UPDATE vendor application (partial — one form page at a time)

export const handleUpdateApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vendorUser, application } = await getVendorApplication(req)
    const input = updateApplicationSchema.parse(req.body)
    const updated = await updateApplication(vendorUser, application, input)

    return sendSuccess(res, updated, "Application updated successfully")
  } catch (err) { next(err) }
}

//* CHANGE country / vendor type — separate, deliberate, DRAFT-only action

export const handleChangeApplicationScope = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { application } = await getVendorApplication(req)
    const input = changeApplicationScopeSchema.parse(req.body)
    const { application: updated, documentsCleared } = await changeApplicationScope(application, input)

    return sendSuccess(
      res,
      updated,
      documentsCleared
        ? "Application scope updated — previously uploaded documents were cleared"
        : "Application scope updated",
    )
  } catch (err) { next(err) }
}

//* PREVIEW vendor application (review page) — operates on "my
//* application", no :id needed since a vendor only ever has one.
export const handlePreviewApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { application } = await getVendorApplication(req)
    const preview = await previewApplication(application.id)
    return sendSuccess(res, preview, "Preview fetched successfully")
  } catch (err) { next(err) }
}

//* SUBMIT vendor application
export const handleSubmitApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vendorUser, application } = await getVendorApplication(req)
    const updated = await submitApplication(vendorUser, application)
    return sendSuccess(res, { id: updated.id, status: updated.status }, "Application submitted successfully")
  } catch (err) { next(err) }
}