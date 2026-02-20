import { Request, Response, Router } from "express"
import countryRouter from './countries.routes'
import vendorTypeRouter from "./vendorTypes.routes"

const v1Router: Router = Router()


v1Router.use('/countries', countryRouter)
v1Router.use('/vendorTypes', vendorTypeRouter)

export default v1Router