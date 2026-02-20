import { Router } from "express"
import {
  getApplication,
  upsertApplication,
  submitApplication,
} from "../../controllers/applications"

const applicationRouter: Router = Router()

//* /api/vendors/v1/applications
applicationRouter.get("/", getApplication)
applicationRouter.post("/upsert-application", upsertApplication)
applicationRouter.post("/submit", submitApplication)

export default applicationRouter