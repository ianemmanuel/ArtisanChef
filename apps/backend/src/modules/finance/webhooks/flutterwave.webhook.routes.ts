import { Router, type Request, type Response } from "express"
import { logger } from "@/lib/pino/logger"
import { handleFlutterwaveWebhook } from "./flutterwave.webhook.service"

const log = logger.child({ module: "flutterwave-webhook-route" })

/*
 * Mounted at /webhooks/flutterwave in bootstrap/app.ts, BEFORE express.json()
 * with express.raw({ type: "application/json" }) — the HMAC is over the exact
 * received bytes, so a re-serialized body would never verify.
 *
 * No auth middleware here (the request is from Flutterwave, not an admin);
 * authenticity is the signature check inside handleFlutterwaveWebhook.
 */
export const flutterwaveWebhookRouter: Router = Router()

flutterwaveWebhookRouter.post("/", async (req: Request, res: Response) => {
  const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : ""
  if (!raw) {
    return res.status(400).json({ received: false, error: "empty body" })
  }

  try {
    const result = await handleFlutterwaveWebhook(raw, req.headers as Record<string, string | undefined>)
    return res.status(result.status).json(result.body)
  } catch (err) {
    // A processing failure must not make Flutterwave hammer us forever with
    // a 5xx loop for a poison event — but we also don't want to silently
    // drop a verified event. Log loudly and 200 only if we know it was
    // recorded; otherwise 500 so it retries.
    log.error({ err }, "Flutterwave webhook handler threw")
    return res.status(500).json({ received: false })
  }
})

export default flutterwaveWebhookRouter
