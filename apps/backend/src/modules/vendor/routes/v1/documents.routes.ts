import { Router } from "express"
import {
  upsertDocument,
  deleteDocument,
} from "../../controllers/applications"

const documentRouter: Router = Router()

// POST /api/v1/vendors/documents
documentRouter.post("/", upsertDocument)

// DELETE /api/v1/vendors/documents/:id
documentRouter.delete("/:id", deleteDocument)

export default documentRouter