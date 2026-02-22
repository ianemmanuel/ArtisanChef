import { Request, Response } from "express"
import { processClerkWebhook } from "./clerk.webhook.service"

export async function handleClerkWebhook(req: Request, res: Response) {
  try {
    await processClerkWebhook(req)
    return res.status(200).json({ received: true })
  } catch (err) {
    console.error("Webhook error:", err)
    return res.status(400).json({ error: "Invalid webhook" })
  }
}