import { Request, Response, NextFunction } from "express"
import { prisma, VendorApplicationStatus, DocumentStatus } from "@repo/db"
import { getVendorUser } from "../../../../helpers/auth/vendorAuth"

export const upsertDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = await getVendorUser(req)
    if (!auth.ok) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const vendorUserId = auth.vendorUser.id

    const {
      applicationId,
      documentTypeId,
      storageKey,
      documentName,
      fileSize,
      mimeType,
      documentNumber,
      issueDate,
      expiryDate,
    } = req.body

    if (!applicationId || !documentTypeId || !storageKey) {
      return res.status(400).json({
        message: "Missing required document fields",
      })
    }

    const application = await prisma.vendorApplication.findUnique({
      where: { id: applicationId },
      include: { documents: true },
    })

    if (!application || application.userId !== vendorUserId) {
      return res.status(404).json({ message: "Application not found" })
    }

    if (
      application.status !== VendorApplicationStatus.DRAFT &&
      application.status !== VendorApplicationStatus.REJECTED
    ) {
      return res.status(403).json({
        message: "Documents cannot be modified at this stage",
      })
    }

    const existingDoc = application.documents.find(
      doc =>
        doc.documentTypeId === documentTypeId &&
        doc.status !== DocumentStatus.WITHDRAWN &&
        doc.supersededAt === null
    )

    if (existingDoc) {
      const updated = await prisma.vendorDocument.update({
        where: { id: existingDoc.id },
        data: {
          storageKey,
          documentName,
          fileSize,
          mimeType,
          documentNumber,
          issueDate,
          expiryDate,
          status: DocumentStatus.PENDING,
          reviewedAt: null,
          approvedAt: null,
          rejectedAt: null,
          rejectionReason: null,
          revisionNotes: null,
        },
      })

      return res.json({
        message: "Document replaced successfully",
        document: updated,
      })
    }

    const created = await prisma.vendorDocument.create({
      data: {
        applicationId: application.id,
        documentTypeId,
        storageKey,
        documentName,
        fileSize,
        mimeType,
        documentNumber,
        issueDate,
        expiryDate,
        status: DocumentStatus.PENDING,
      },
    })

    return res.status(201).json({
      message: "Document uploaded successfully",
      document: created,
    })
  } catch (err) {
    next(err)
  }
}

export const deleteDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = await getVendorUser(req)
    if (!auth.ok) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const vendorUserId = auth.vendorUser.id
    const { id } = req.params

    const document = await prisma.vendorDocument.findUnique({
      where: { id },
      include: { application: true },
    })

    if (!document || !document.application) {
      return res.status(404).json({ message: "Document not found" })
    }

    if (document.application.userId !== vendorUserId) {
      return res.status(403).json({ message: "Unauthorized" })
    }

    if (
      document.application.status !== VendorApplicationStatus.DRAFT &&
      document.application.status !== VendorApplicationStatus.REJECTED
    ) {
      return res.status(403).json({
        message: "Documents cannot be modified at this stage",
      })
    }

    await prisma.vendorDocument.delete({
      where: { id },
    })

    return res.json({
      message: "Document deleted successfully",
    })
  } catch (err) {
    next(err)
  }
}
