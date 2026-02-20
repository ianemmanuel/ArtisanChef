import { Router } from "express"
import {
  getOnboardingCountries,

} from "../../controllers/countries"

const countryRouter: Router = Router()

//* /api/vendors/v1/meta/countries
countryRouter.get("/", getOnboardingCountries)


export default countryRouter