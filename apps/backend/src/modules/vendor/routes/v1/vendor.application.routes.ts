import { Router } from "express"
import {
  handleGetApplication,
  handleCreateApplication,
  handleUpdateApplication,
  handleChangeApplicationScope,
  handleSubmitApplication,
  handlePreviewApplication,
} from "../../controllers/vendor.application.controller"

const applicationRouter: Router = Router()

//* /api/vendors/v1/applications
applicationRouter.get("/get", handleGetApplication)
applicationRouter.post("/create", handleCreateApplication)
applicationRouter.patch("/update", handleUpdateApplication)
applicationRouter.patch("/change-scope", handleChangeApplicationScope)
applicationRouter.get("/preview", handlePreviewApplication)
applicationRouter.post("/submit", handleSubmitApplication)

export default applicationRouter