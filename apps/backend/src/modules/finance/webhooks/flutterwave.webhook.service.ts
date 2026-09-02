import crypto from "node:crypto"
import { prisma } from "@repo/db"
import { logger } from "@/lib/pino/logger"
import { getProviderAdapter, hasProviderAdapter } from "../providers/provider.registry"
import { providerSecretsResolver } from "../secrets/provider-secrets.resolver"
import { readFlutterwaveWebhookSecret } from "../providers/flutterwave"
import { FLUTTERWAVE_PROVIDER_CODE } from "../providers/flutterwave/flutterwave.constants"
import { recordProviderWebhookEvent } from "../services/finance.webhookEvent.service"

const log = logger.child({ module: "flutterwave-webhook" })

export interface WebhookHandlerResult {
  /** HTTP status to return to Flutterwave. */
  status: 200 | 401
  body: Record<string, unknown>
}

/**
 * The whole inbound-webhook boundary for Flutterwave:
 *   verify signature -> normalize -> record idempotently.
 *
 * NO downstream processing (orders / earnings / payouts / ledger) — Phase
 * 1C establishes the secure boundary only.
 *
 * Signature is checked against every ACTIVE/SUSPENDED Flutterwave provider
 * account's own webhook secret hash (usually exactly one). The URL is static
 * and non-secret; authenticity comes entirely from the signature.
 */
export async function handleFlutterwaveWebhook(
  rawBody: string,
  headers: Record<string, string | undefined>,
): Promise<WebhookHandlerResult> {
  if (!hasProviderAdapter(FLUTTERWAVE_PROVIDER_CODE)) {
    log.error("Flutterwave adapter is not registered — cannot verify webhook")
    return { status: 401, body: { received: false } }
  }
  const adapter = getProviderAdapter(FLUTTERWAVE_PROVIDER_CODE)
  if (!adapter.webhooks) {
    log.error("Flutterwave adapter has no webhook capability")
    return { status: 401, body: { received: false } }
  }

  // Any non-DISABLED account: a webhook secret hash is configured on a DRAFT
  // account too, and Flutterwave starts delivering as soon as the URL is
  // registered — before our account is activated. DISABLED is the only
  // terminal "these credentials are dead" state.
  const accounts = await prisma.countryProviderAccount.findMany({
    where: {
      paymentProvider: { code: FLUTTERWAVE_PROVIDER_CODE },
      status: { not: "DISABLED" },
    },
    select: { id: true, secretAlias: true },
  })

  let matchedAccountId: string | null = null
  for (const account of accounts) {
    let secretHash: string
    try {
      const bundle = await providerSecretsResolver.resolve(account.secretAlias)
      secretHash = readFlutterwaveWebhookSecret(bundle)
    } catch {
      // No usable webhook secret for this account — can't verify against it.
      continue
    }
    if (adapter.webhooks.verifySignature(rawBody, headers, secretHash)) {
      matchedAccountId = account.id
      break
    }
  }

  if (!matchedAccountId) {
    // Never log the body or any header value — just that verification failed.
    log.warn({ accountsTried: accounts.length }, "Rejected a Flutterwave webhook: no signature match")
    return { status: 401, body: { received: false } }
  }

  const event = adapter.webhooks.parseEvent(rawBody)
  const providerEventId =
    event.providerEventId ?? crypto.createHash("sha256").update(rawBody).digest("hex")

  const result = await recordProviderWebhookEvent({
    provider: FLUTTERWAVE_PROVIDER_CODE,
    event,
    providerEventId,
    countryProviderAccountId: matchedAccountId,
  })

  log.info(
    { eventType: event.type, duplicate: result.duplicate, providerRef: event.providerRef },
    "Flutterwave webhook accepted",
  )
  return { status: 200, body: { received: true, duplicate: result.duplicate } }
}
