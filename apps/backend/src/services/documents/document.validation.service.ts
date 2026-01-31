import { prisma, DocumentTypeStatus, DocumentStatus } from "@repo/db"

export const DocumentValidationService = {
  async getRequiredDocumentTypes(application: {
    countryId: string
    vendorTypeId: string
  }) {
    return prisma.documentTypeConfig.findMany({
      where: {
        countryId: application.countryId,
        scope: "VENDOR",
        status: DocumentTypeStatus.ACTIVE,
        vendorTypeConfigs: {
          some: {
            vendorTypeId: application.vendorTypeId,
            isRequired: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
    })
  },

  async getAllowedDocumentTypes(application: {
    countryId: string
    vendorTypeId: string
  }) {
    return prisma.documentTypeConfig.findMany({
      where: {
        countryId: application.countryId,
        scope: "VENDOR",
        status: DocumentTypeStatus.ACTIVE,
        vendorTypeConfigs: {
          some: {
            vendorTypeId: application.vendorTypeId,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
    })
  },

  async validateApplication(application: {
    id: string
    countryId: string
    vendorTypeId: string
  }) {
    const requiredTypes = await this.getRequiredDocumentTypes(application)

    const uploadedDocs = await prisma.vendorDocument.findMany({
      where: {
        applicationId: application.id,
        status: {
          in: [DocumentStatus.PENDING, DocumentStatus.APPROVED],
        },
      },
      select: {
        documentTypeId: true,
      },
    })

    const uploadedTypeIds = new Set(
      uploadedDocs.map(d => d.documentTypeId)
    )

    const missing = requiredTypes.filter(
      type => !uploadedTypeIds.has(type.id)
    )

    if (missing.length > 0) {
      return {
        ok: false as const,
        message: "Missing required documents",
        missingDocuments: missing.map(d => d.name),
      }
    }

    return { ok: true as const }
  },

  async getUploadProgress(application: {
    id: string
    countryId: string
    vendorTypeId: string
  }) {
    const [required, allowed, uploaded] = await Promise.all([
      this.getRequiredDocumentTypes(application),
      this.getAllowedDocumentTypes(application),
      prisma.vendorDocument.findMany({
        where: {
          applicationId: application.id,
          status: {
            in: [DocumentStatus.PENDING, DocumentStatus.APPROVED],
          },
        },
        select: { documentTypeId: true },
      }),
    ])

    const uploadedTypeIds = new Set(
      uploaded.map(d => d.documentTypeId)
    )

    const uploadedRequired = required.filter(r =>
      uploadedTypeIds.has(r.id)
    )

    return {
      requiredTotal: required.length,
      uploadedRequired: uploadedRequired.length,
      optionalTotal: Math.max(allowed.length - required.length, 0),
      uploadedTotal: uploaded.length,
      isComplete: uploadedRequired.length === required.length,
      percentage:
        required.length === 0
          ? 100
          : Math.round(
              (uploadedRequired.length / required.length) * 100
            ),
    }
  },
}
