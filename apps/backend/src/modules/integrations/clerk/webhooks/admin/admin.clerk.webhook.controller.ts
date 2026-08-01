import { Request, Response } from "express"
import { processAdminClerkWebhook } from "./admin.clerk.webhook.service"
import { logger } from "@/lib/pino/logger"

const webhookLog = logger.child({ module: "webhook:admin" })

/*
 * Always returns 200 on handled events (including deliberate no-ops).
 * Returns 400 only on verification failure or bad payload.
 */
export async function handleAdminClerkWebhook(req: Request, res: Response) {
  try {
    await processAdminClerkWebhook(req)
    return res.status(200).json({ received: true })
  } catch (err) {
    webhookLog.error({ err }, "Unhandled error processing admin Clerk webhook")
    // Return 400 so Svix knows delivery failed and will retry.
    // Returning 200 on a genuine error would silently swallow it.
    return res.status(400).json({ error: "Webhook processing failed" })
  }
}