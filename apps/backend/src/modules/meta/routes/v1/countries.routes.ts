import { Router } from "express"
import {
  getOnboardingCountries,

} from "../../controllers/countries"

const countryRouter: Router = Router()

countryRouter.get("/", getOnboardingCountries)


export default countryRouter