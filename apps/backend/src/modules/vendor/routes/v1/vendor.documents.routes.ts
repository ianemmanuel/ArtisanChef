import { Router } from "express"
import {
  handleUpsertDocument,
  handleDeleteDocument,
  handleGetApplicationDocuments,
  handlePreviewDocument,
  handlePresignUpload,
} from "../../controllers/vendor.document.controller"

const documentRouter: Router = Router()

//* /api/vendors/v1/documents
documentRouter.post("/presign", handlePresignUpload)
documentRouter.post("/upsert", handleUpsertDocument)
documentRouter.delete("/delete/:id", handleDeleteDocument) 
documentRouter.get("/:id/preview", handlePreviewDocument)
documentRouter.get("/requirements", handleGetApplicationDocuments)

export default documentRouter