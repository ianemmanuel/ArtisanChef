import { Request, Response, NextFunction } from "express"
import { prisma, VendorApplicationStatus } from "@repo/db"
import { getVendorUser } from "@/helpers/auth/vendorAuth"
import { DocumentRequirementService } from "@/services/documents"
import { R2Service } from "@/services/r2"
import path from "path"

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]

export const generateFileUploadUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = await getVendorUser(req)
    if (!auth.ok) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const { applicationId, documentTypeId, fileName, mimeType } = req.body

    if (!applicationId || !documentTypeId || !fileName || !mimeType) {
      return res.status(400).json({ message: "Missing required fields" })
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return res.status(400).json({ message: "Unsupported file type" })
    }

    const application = await prisma.vendorApplication.findUnique({
      where: { id: applicationId },
    })

    if (!application || application.userId !== auth.vendorUser.id) {
      return res.status(404).json({ message: "Application not found" })
    }

    if (
      application.status !== VendorApplicationStatus.DRAFT &&
      application.status !== VendorApplicationStatus.REJECTED
    ) {
      return res.status(403).json({
        message: "Cannot upload documents at this stage",
      })
    }

    const validation =
      await DocumentRequirementService.validateDocumentTypeForUpload(
        application,
        documentTypeId
      )

    if (!validation.ok) {
      return res.status(400).json({ message: validation.message })
    }

    const extension = path.extname(fileName).replace(".", "")

    const storageKey = R2Service.generateStorageKey(
      applicationId,
      documentTypeId,
      extension
    )

    const uploadUrl = await R2Service.generateUploadUrl(
      storageKey,
      mimeType
    )

    return res.json({
      uploadUrl,
      storageKey,
    })
  } catch (err) {
    next(err)
  }
}


export const getFileViewUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = await getVendorUser(req)
    if (!auth.ok) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const { id } = req.params

    const document = await prisma.vendorDocument.findUnique({
      where: { id },
      include: { application: true },
    })

    if (!document || !document.application) {
      return res.status(404).json({ message: "Document not found" })
    }

    if (document.application.userId !== auth.vendorUser.id) {
      return res.status(403).json({ message: "Unauthorized" })
    }

    const url = await R2Service.generateViewUrl(document.storageKey)

    return res.json({ url })
  } catch (err) {
    next(err)
  }
}
