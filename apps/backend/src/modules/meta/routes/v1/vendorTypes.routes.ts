import { Router } from "express"
import {
  getOnboardingVendorTypes,

} from "../../controllers/vendorTypes"

const vendorTypeRouter: Router = Router()

//* /api/meta/v1/vendor-types
vendorTypeRouter.get("/", getOnboardingVendorTypes)


export default vendorTypeRouter