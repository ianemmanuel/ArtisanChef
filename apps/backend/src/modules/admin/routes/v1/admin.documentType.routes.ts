import { Router } from "express"
import { AdminPermissions } from "@repo/types/enums"
import { requirePermission } from "@/modules/admin/middleware"
import {
  handleListDocumentTypesForCountry,
  handleGetDocumentType,
  handleCreateDocumentType,
  handleUpdateDocumentType,
  handleActivateDocumentType,
  handleDeactivateDocumentType,
  handleAssignDocumentTypeToVendorType,
  handleUpdateDocumentTypeVendorTypeRequirement,
  handleRemoveDocumentTypeFromVendorType,
  handleGetRequirementsForCountryAndVendorType,
} from "../../controllers/admin.documentType.controller"

const documentTypeRouter: Router = Router()

const READ  = requirePermission(AdminPermissions.SETTINGS_DOCUMENTS_READ)
const WRITE = requirePermission(AdminPermissions.SETTINGS_DOCUMENTS_WRITE)

// "Given country X + vendor type Y, what documents are required" —
// same query the live vendor onboarding flow already uses.
documentTypeRouter.get("/requirements", READ, handleGetRequirementsForCountryAndVendorType)

documentTypeRouter.get("/", READ, handleListDocumentTypesForCountry)
documentTypeRouter.post("/", WRITE, handleCreateDocumentType)
documentTypeRouter.get("/:documentTypeId", READ, handleGetDocumentType)
documentTypeRouter.patch("/:documentTypeId", WRITE, handleUpdateDocumentType)
documentTypeRouter.patch("/:documentTypeId/activate", WRITE, handleActivateDocumentType)
documentTypeRouter.patch("/:documentTypeId/deactivate", WRITE, handleDeactivateDocumentType)
documentTypeRouter.post("/:documentTypeId/vendor-types", WRITE, handleAssignDocumentTypeToVendorType)

// Requirement rows (DocumentTypeVendorType) are addressed by their own id —
// a document type can be linked to several vendor types, each a separate row.
documentTypeRouter.patch("/requirements/:requirementId", WRITE, handleUpdateDocumentTypeVendorTypeRequirement)
documentTypeRouter.delete("/requirements/:requirementId", WRITE, handleRemoveDocumentTypeFromVendorType)

export default documentTypeRouter
