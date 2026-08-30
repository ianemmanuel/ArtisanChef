import { Router } from "express"
import {
  handleListOutlets,
  handleGetOutlet,
  handleCreateOutlet,
  handleUpdateOutlet,
  handleDeactivateOutlet,
  handleReactivateOutlet,
  handleCloseOutletTemporarily,
  handleReopenOutlet,
  handleSetPrimaryOutlet,
  handleSetOperatingHours,
} from "../../controllers/vendor.outlet.controller"
import {
  handleGetOutletDocumentStatus,
  handlePresignOutletDocumentUpload,
  handleUpsertOutletDocument,
  handleGetOutletDocumentPreview,
  handleGetOutletInspections,
} from "../../controllers/vendor.outletDocument.controller"

const outletRouter: Router = Router()

//* /api/vendors/v1/outlets

outletRouter.get("/",    handleListOutlets)
outletRouter.post("/",   handleCreateOutlet)

outletRouter.get("/:id",    handleGetOutlet)
outletRouter.patch("/:id",  handleUpdateOutlet)

//* Activation / closure
outletRouter.post("/:id/deactivate",         handleDeactivateOutlet)
outletRouter.post("/:id/reactivate",         handleReactivateOutlet)
outletRouter.post("/:id/close-temporarily",  handleCloseOutletTemporarily)
outletRouter.post("/:id/reopen",             handleReopenOutlet)

//* Other operations
outletRouter.post("/:id/set-primary",        handleSetPrimaryOutlet)
outletRouter.put("/:id/operating-hours",     handleSetOperatingHours)

//* OUTLET-scoped documents (health permit, etc.)
outletRouter.get("/:id/documents/status",             handleGetOutletDocumentStatus)
outletRouter.post("/:id/documents/presign",           handlePresignOutletDocumentUpload)
outletRouter.post("/:id/documents/upsert",            handleUpsertOutletDocument)
outletRouter.get("/:id/documents/:documentId/preview", handleGetOutletDocumentPreview)

//* Premises inspections (read-only for the vendor)
outletRouter.get("/:id/inspections", handleGetOutletInspections)

export default outletRouter