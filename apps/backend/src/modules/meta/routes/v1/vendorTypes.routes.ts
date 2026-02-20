import { Router } from "express"
import {
  getOnboardingVendorTypes,

} from "../../controllers/vendorTypes"

const vendorTypeRouter: Router = Router()

//* /api/vendors/v1/meta/vendor-types
vendorTypeRouter.get("/", getOnboardingVendorTypes)


export default vendorTypeRouter