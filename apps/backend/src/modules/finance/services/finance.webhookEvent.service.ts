import { prisma, Prisma } from "@repo/db"
import { logger } from "@/lib/pino/logger"
import type { NormalizedWebhookEvent } from "../providers/provider.types"

const serviceLog = logger.child({ module: "finance-webhook-event" })

/*
 * The provider-event idempotency boundary. Every payment-provider webhook
 * that passes signature verification is recorded here exactly once, keyed by
 * (provider, providerEventId). "Same event delivered twice => stored (and
 * later processed) once."
 *
 * Phase 1C stops at RECEIVED — nothing consumes these rows yet. A later
 * phase adds the finance-event processor.
 */

export interface RecordWebhookEventInput {
  /** PaymentProvider.code, e.g. "FLUTTERWAVE". */
  provider: string
  event: NormalizedWebhookEvent
  /** Stable id used for idempotency — the provider's event id, or a body hash fallback. */
  providerEventId: string
  countryProviderAccountId: string | null
}

export interface RecordWebhookEventResult {
  id: string
  /** true if this exact event id had already been recorded (no new row written). */
  duplicate: boolean
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
}

export async function recordProviderWebhookEvent(
  input: RecordWebhookEventInput,
): Promise<RecordWebhookEventResult> {
  const { provider, event, providerEventId, countryProviderAccountId } = input

  try {
    const row = await prisma.providerWebhookEvent.create({
      data: {
        provider,
        providerEventId,
        eventType: event.type,
        providerRef: event.providerRef,
        countryProviderAccountId,
        status: "RECEIVED",
        payload: event.raw as Prisma.InputJsonValue,
      },
      select: { id: true },
    })
    serviceLog.info({ provider, providerEventId, eventType: event.type }, "Provider webhook event recorded")
    return { id: row.id, duplicate: false }
  } catch (err) {
    if (isUniqueViolation(err)) {
      const existing = await prisma.providerWebhookEvent.findUnique({
        where: { provider_providerEventId: { provider, providerEventId } },
        select: { id: true },
      })
      serviceLog.info({ provider, providerEventId }, "Duplicate provider webhook event ignored")
      return { id: existing?.id ?? "unknown", duplicate: true }
    }
    throw err
  }
}
