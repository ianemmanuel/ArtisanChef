import { Router } from "express"
import { requireVendorState } from "../../middlewares"
import {
  handleGetAccountDocumentStatus,
  handlePresignAccountDocumentUpload,
  handleUpsertAccountDocument,
} from "../../controllers/vendor.accountDocument.controller"

const router: Router = Router()

//* /api/vendors/v1/account-documents — ACTIVE accounts only, distinct
//* from /documents (application-scoped, DRAFT/NEEDS_REVISION only).
router.use(requireVendorState("ACTIVE"))

router.get("/status",  handleGetAccountDocumentStatus)
router.post("/presign", handlePresignAccountDocumentUpload)
router.post("/upsert",  handleUpsertAccountDocument)

export default router
