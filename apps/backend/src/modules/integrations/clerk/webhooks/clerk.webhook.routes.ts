import { Router } from "express"
import { handleClerkWebhook } from "./clerk.webhook.controllers"

const router:Router = Router()

router.post("/", handleClerkWebhook)

export default router