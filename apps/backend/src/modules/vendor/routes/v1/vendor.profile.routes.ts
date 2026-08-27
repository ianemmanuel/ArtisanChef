import { Router } from "express"
import { requireVendorState } from "../../middlewares"
import {
  handleGetVendorProfile,
  handleUpsertVendorProfile,
  handleGetGoLiveStatus,
  handlePublishVendorProfile,
  handleUnpublishVendorProfile,
} from "../../controllers/vendor.profile.controller"

const profileRouter: Router = Router()

//* /vendor/v1/profile — only meaningful once approved, same convention as
//* /account-documents.
profileRouter.use(requireVendorState("ACTIVE"))

profileRouter.get ("/",              handleGetVendorProfile)
profileRouter.put ("/",              handleUpsertVendorProfile)
profileRouter.get ("/go-live-status", handleGetGoLiveStatus)
profileRouter.post("/publish",       handlePublishVendorProfile)
profileRouter.post("/unpublish",     handleUnpublishVendorProfile)

export default profileRouter
