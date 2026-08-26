import nodemailer, { type Transporter } from "nodemailer"
import { env } from "@/env"
import { logger } from "@/lib/pino/logger"

const mailLog = logger.child({ module: "mailer" })

export interface SendEmailInput {
  to      : string
  subject : string
  html    : string
  /** Plain-text fallback — recommended for deliverability, not required. */
  text?   : string
}

let transporter: Transporter | null = null
let warnedNoTransport = false

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null
  if (transporter) return transporter
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  })
  return transporter
}

/*
 * Transactional email — deliberately no-op (logged, not thrown) when
 * SMTP_HOST isn't configured, same "works without the real thing
 * configured yet" convention this codebase uses for mock revenue figures.
 * A caller that needs to know whether an email actually went out gets that
 * from the returned `sent` flag rather than an exception either way — a
 * failed/skipped send should never block the compliance action that
 * triggered it (the VendorNotification row and audit log are the durable
 * record; email is best-effort on top).
 */
export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean }> {
  const client = getTransporter()
  if (!client) {
    if (!warnedNoTransport) {
      mailLog.warn("SMTP_HOST not configured — emails will be logged, not sent")
      warnedNoTransport = true
    }
    mailLog.info({ to: input.to, subject: input.subject }, "Email skipped (no SMTP configured)")
    return { sent: false }
  }

  try {
    await client.sendMail({
      from: env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    })
    mailLog.info({ to: input.to, subject: input.subject }, "Email sent")
    return { sent: true }
  } catch (err) {
    mailLog.error({ err, to: input.to, subject: input.subject }, "Email send failed")
    return { sent: false }
  }
}
