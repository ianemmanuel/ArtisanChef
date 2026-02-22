import { Webhook } from "svix"
import { prisma } from "@repo/db"
import { Request } from "express"

const CLERK_WEBHOOK_SECRETS = {
  vendor: process.env.CLERK_VENDOR_WEBHOOK_SECRET!,
  customer: process.env.CLERK_CUSTOMER_WEBHOOK_SECRET!,
  courier: process.env.CLERK_COURIER_WEBHOOK_SECRET!,
  admin: process.env.CLERK_ADMIN_WEBHOOK_SECRET!,
}

export async function processClerkWebhook(req: Request) {
  // express.raw() gives us a Buffer — convert it to a string
  const rawBody = req.body as Buffer
  if (!Buffer.isBuffer(rawBody)) {
    throw new Error("Request body must be raw. Ensure express.raw() middleware is applied.")
  }
  const payload = rawBody.toString("utf8")
  const headers = req.headers

  let verifiedEvent: any = null
  let appType: keyof typeof CLERK_WEBHOOK_SECRETS | null = null

  for (const [app, secret] of Object.entries(CLERK_WEBHOOK_SECRETS)) {
    try {
      const wh = new Webhook(secret)
      verifiedEvent = wh.verify(payload, headers as any)
      appType = app as keyof typeof CLERK_WEBHOOK_SECRETS
      break
    } catch {
      continue
    }
  }

  if (!verifiedEvent || !appType) {
    throw new Error("Webhook verification failed")
  }

  if (verifiedEvent.type !== "user.created") {
    return
  }

  const clerkId = verifiedEvent.data.id
  const email = verifiedEvent.data.email_addresses?.[0]?.email_address

  if (!clerkId || !email) {
    throw new Error("Invalid Clerk payload")
  }

  if (appType === "vendor") {
    await prisma.vendorUser.upsert({
      where: { clerkId },
      update: {},
      create: { clerkId, email },
    })
  }
}