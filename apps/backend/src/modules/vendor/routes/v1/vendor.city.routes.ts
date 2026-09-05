import { Router } from "express"
import { handleListCities } from "../../controllers/vendor.city.controller"

const cityRouter: Router = Router()

//* /vendor/v1/cities — read-only reference lookup for the outlet create form
cityRouter.get("/", handleListCities)

export default cityRouter
