import { S3Client } from "@aws-sdk/client-s3"
import cron from "node-cron"

import { env } from "@/env"
import { logger } from "@/lib/pino/logger"
import { startDocumentExpiryCron } from "@/jobs/vendor/document-expiry.job"
import { startOutletComplianceCron } from "@/jobs/vendor/outlet-compliance.job"
import { startComplianceCaseSyncCron } from "@/jobs/vendor/compliance-case-sync.job"
import { startVendorOpsNotificationsCron } from "@/jobs/vendor/vendor-ops-notifications.job"
import { registerProviderAdapters } from "@/modules/finance/providers/register-adapters"
// TODO: point this at your real audit deletion job function
// import { runAuditDeletionJob } from "@/services/audit"

let auditCronTask: ReturnType<typeof cron.schedule> | undefined
let documentExpiryCronTask: ReturnType<typeof cron.schedule> | undefined
let outletComplianceCronTask: ReturnType<typeof cron.schedule> | undefined
let complianceCaseSyncCronTask: ReturnType<typeof cron.schedule> | undefined
let vendorOpsNotificationsCronTask: ReturnType<typeof cron.schedule> | undefined

//* R2 client — construction is synchronous and doesn't touch the
//* network, so there's nothing to await. Kept as a singleton here so
//* every module that needs R2 imports the same client instead of
//* building its own (which is what usually causes "why is this env
//* var undefined" bugs mid-request).
export const r2Client = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
})

export async function initExternalServices() {
  logger.info({ bucket: env.R2_BUCKET_NAME }, "R2 client ready")

  //* Finance — register the concrete payment-provider adapters into the
  //* provider registry. The finance domain resolves a capability through
  //* the registry; it never instantiates a provider itself.
  registerProviderAdapters()

  //* Clerk: your vendor/admin secret keys and customer/courier JWKS
  //* URLs are already guaranteed present by env.ts. If you construct
  //* explicit Clerk backend clients (createClerkClient) per module
  //* anywhere in the codebase, move that construction here — that's
  //* what turns "bad Clerk key" into a boot-time failure instead of
  //* a 401 on the first authenticated request.

  if (env.AUDIT_DELETION_ENABLED) {
    auditCronTask = cron.schedule("0 3 1 * *", () => {
      // runAuditDeletionJob().catch((err) => {
      //   logger.error({ err }, "Audit deletion job failed")
      // })
    })

    logger.info("Audit deletion cron scheduled (monthly, 03:00 on the 1st)")
  } else {
    logger.info("Audit deletion disabled — skipping cron registration")
  }

  documentExpiryCronTask = startDocumentExpiryCron()
  outletComplianceCronTask = startOutletComplianceCron()
  complianceCaseSyncCronTask = startComplianceCaseSyncCron()
  vendorOpsNotificationsCronTask = startVendorOpsNotificationsCron()
}

//* Called from shutdown.ts so a scheduled job doesn't fire mid-shutdown
//* or hold the event loop open after server.close().
export function stopExternalServices() {
  auditCronTask?.stop()
  documentExpiryCronTask?.stop()
  outletComplianceCronTask?.stop()
  complianceCaseSyncCronTask?.stop()
  vendorOpsNotificationsCronTask?.stop()
}