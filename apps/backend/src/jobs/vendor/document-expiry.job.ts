import cron from "node-cron"
import { prisma, DocumentStatus } from "@repo/db"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"
import { SYSTEM_USER_ID } from "@/constants/system"
import { DOCUMENT_EXPIRY_CRON_INTERVAL_HOURS } from "@/constants/vendor"

const cronLog = logger.child({ module: "document-expiry-cron" })

// ─── Mark past-due vendor documents as expired ─────────────────────────────
// Runs every DOCUMENT_EXPIRY_CRON_INTERVAL_HOURS. Finds every VendorDocument
// still APPROVED whose expiryDate has passed and flips it to EXPIRED.
//
// This is detection/flagging only — see the compliance recon decision that
// automatic vendor suspension on document expiry is explicitly out of scope
// for now. Nothing here touches VendorAccount.status.
//
// Scoped to VendorDocument only. OutletDocument is intentionally untouched —
// outlet administration is a separate, currently-deferred effort.
//
// Idempotent by construction: the WHERE clause only ever matches documents
// that are still APPROVED, so a document already flipped to EXPIRED by a
// previous run (or concurrently) simply won't match again. Uses expiryDate
// as stored (UTC) — expiry is a calendar-day concept but the ~6h run
// interval means timezone edge cases resolve within one cycle, which is
// precise enough for a "needs human review" flag, not a hard cutoff.
//
// SETUP: call startDocumentExpiryCron() once when the server starts,
// alongside startOutletReopenCron().

export function startDocumentExpiryCron(): ReturnType<typeof cron.schedule> {
  const cronExpression = `0 */${DOCUMENT_EXPIRY_CRON_INTERVAL_HOURS} * * *`

  const task = cron.schedule(cronExpression, async () => {
    try {
      const now = new Date()

      const newlyExpired = await prisma.vendorDocument.findMany({
        where : { status: DocumentStatus.APPROVED, expiryDate: { lt: now }, supersededAt: null },
        select: { id: true, vendorId: true, documentTypeId: true },
      })

      if (newlyExpired.length === 0) return

      await prisma.vendorDocument.updateMany({
        where: { id: { in: newlyExpired.map((d) => d.id) } },
        data : { status: DocumentStatus.EXPIRED },
      })

      // One audit entry per document — these are real state changes an
      // admin should be able to trace, same as any other status change in
      // this module, just system-actuated (SYSTEM_USER_ID) rather than
      // admin-actuated. Fire-and-forget, matching auditService's convention
      // elsewhere (never blocks the mutation it's logging).
      for (const doc of newlyExpired) {
        auditService.log({
          adminUserId: SYSTEM_USER_ID,
          action     : "vendor_document.expired",
          entityType : "VendorDocument",
          entityId   : doc.id,
          changes    : { before: { status: "APPROVED" }, after: { status: "EXPIRED" } },
          metadata   : { vendorId: doc.vendorId, documentTypeId: doc.documentTypeId, source: "document-expiry-cron" },
        })
      }

      cronLog.info({ count: newlyExpired.length, at: now.toISOString() }, "Marked vendor documents expired")
    } catch (err) {
      // Never let a cron failure crash the process — log and continue
      cronLog.error({ err }, "document-expiry-cron failed")
    }
  })

  cronLog.info(
    { expression: cronExpression, intervalHours: DOCUMENT_EXPIRY_CRON_INTERVAL_HOURS },
    "Document expiry cron scheduled",
  )

  return task
}
