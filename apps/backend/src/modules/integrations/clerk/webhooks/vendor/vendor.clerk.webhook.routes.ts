import { Router } from "express"
import { handleVendorClerkWebhook } from "./vendor.clerk.webhook.controller"

const router: Router = Router()


router.post("/", handleVendorClerkWebhook)

export default router