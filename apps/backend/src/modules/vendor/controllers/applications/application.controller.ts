import { Request, Response, NextFunction } from "express"
import { prisma, VendorApplicationStatus } from "@repo/db"
import { getVendorUser } from "../../../../helpers/auth/vendorAuth"
import { ClerkVendorStateService } from "../../../../services/clerk"
import { DocumentValidationService } from "../../../../services/documents/document.validation.service"

//* GET vendor application
export const getApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = await getVendorUser(req)
    if (!auth.ok) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const application = await prisma.vendorApplication.findFirst({
      where: {
        userId: auth.vendorUser.id,
      },
      include: {
        country: true,
        vendorType: true,
        documents: {
          where: { status: { not: "WITHDRAWN" } },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!application) {
      return res.status(404).json({ message: "No application found" })
    }

    return res.json({ application })
  } catch (err) {
    next(err)
  }
}

//* CREATE or UPDATE vendor application
export const upsertApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = await getVendorUser(req)
    if (!auth.ok) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const userId = auth.vendorUser.id!
    const clerkUserId = auth.vendorUser.clerkId!

    const {
      countryId,
      vendorTypeId,
      otherVendorType,
      legalBusinessName,
      registrationNumber,
      taxId,
      businessEmail,
      businessPhone,
      ownerFirstName,
      ownerLastName,
      ownerPhone,
      ownerEmail,
      businessAddress,
      addressLine2,
      postalCode,
    } = req.body

    if (
      !countryId ||
      !vendorTypeId ||
      !legalBusinessName ||
      !businessEmail ||
      !ownerFirstName ||
      !ownerLastName ||
      !businessAddress
    ) {
      return res.status(400).json({
        message: "Missing required fields",
      })
    }

    const existing = await prisma.vendorApplication.findUnique({
      where: { userId },
    })

    if (!existing) {
      const application = await prisma.vendorApplication.create({
        data: {
          userId,
          countryId,
          vendorTypeId,
          otherVendorType,
          legalBusinessName,
          registrationNumber,
          taxId,
          businessEmail,
          businessPhone,
          ownerFirstName,
          ownerLastName,
          ownerPhone,
          ownerEmail,
          businessAddress,
          addressLine2,
          postalCode,
          status: VendorApplicationStatus.DRAFT,
        },
      })

      await ClerkVendorStateService.setVendorApplicationStatus(
        clerkUserId,
        VendorApplicationStatus.DRAFT
      )

      return res.status(201).json({
        message: "Application created",
        application,
      })
    }

    if (
      existing.status !== VendorApplicationStatus.DRAFT &&
      existing.status !== VendorApplicationStatus.REJECTED
    ) {
      return res.status(403).json({
        message: `Application cannot be edited while ${existing.status}`,
      })
    }

    if (existing.countryId !== countryId) {
      return res.status(400).json({
        message: "Country cannot be changed once application is created",
      })
    }

    const updated = await prisma.vendorApplication.update({
      where: { id: existing.id },
      data: {
        vendorTypeId,
        otherVendorType,
        legalBusinessName,
        registrationNumber,
        taxId,
        businessEmail,
        businessPhone,
        ownerFirstName,
        ownerLastName,
        ownerPhone,
        ownerEmail,
        businessAddress,
        addressLine2,
        postalCode,
        status:
          existing.status === VendorApplicationStatus.REJECTED
            ? VendorApplicationStatus.DRAFT
            : existing.status,
        rejectionReason: null,
        revisionNotes: null,
        reviewedAt: null,
        reviewedBy: null,
      },
    })

    await ClerkVendorStateService.setVendorApplicationStatus(
      clerkUserId,
      VendorApplicationStatus.DRAFT
    )

    return res.json({
      message:
        existing.status === VendorApplicationStatus.REJECTED
          ? "Application revised and awaiting approval"
          : "Application updated",
      application: updated,
    })
  } catch (err) {
    next(err)
  }
}

//* SUBMIT vendor application
export const submitApplication = async (
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
    const clerkUserId = auth.vendorUser.clerkId

    const application = await prisma.vendorApplication.findUnique({
      where: { userId: vendorUserId },
      include: {
        country: true,
        vendorType: true,
      },
    })

    if (!application) {
      return res.status(404).json({
        message: "No application found",
      })
    }

    if (application.status !== VendorApplicationStatus.DRAFT) {
      return res.status(403).json({
        message: "Only draft applications can be submitted",
      })
    }

    const validation =
      await DocumentValidationService.validateApplication(application)

    if (!validation.ok) {
      return res.status(400).json({
        message: validation.message,
        missingDocuments: validation.missingDocuments,
      })
    }

    const submitted = await prisma.vendorApplication.update({
      where: { id: application.id },
      data: {
        status: VendorApplicationStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    })

    await ClerkVendorStateService.setVendorApplicationStatus(
      clerkUserId,
      VendorApplicationStatus.SUBMITTED
    )

    return res.json({
      message:
        "Application submitted successfully. Review will be completed within 48 hours.",
      application: submitted,
    })
  } catch (err) {
    next(err)
  }
}
