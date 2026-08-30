import cron from "node-cron"
import { prisma } from "@repo/db"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"
import { SYSTEM_USER_ID } from "@/constants/system"
import {
  DOCUMENT_EXPIRY_CRON_INTERVAL_HOURS,
  OUTLET_DOC_EXPIRY_REMINDER_THRESHOLDS,
  MAX_OUTLET_COMPLIANCE_SCAN,
} from "@/constants/vendor"
import { recomputeOutletClearance } from "@/modules/vendor/services/vendor.outletDocument.service"
import {
  notifyVendorOutletCompliance,
  notifyAdminsOutletAutoSuspended,
  type OutletComplianceTarget,
} from "@/modules/admin/services/admin.outlet.notification.service"

const cronLog = logger.child({ module: "outlet-compliance-cron" })
const DAY_MS = 86_400_000

/*
 * Outlet-document compliance reconciliation. Runs on the same cadence as
 * document-expiry (right after it), per active country, bounded per country.
 *
 *  1. Escalating pre-expiry reminders — for each current outlet document with
 *     an expiry date, send the vendor a reminder as it crosses each
 *     day-threshold (60/30/14/7/3/1, then day-of). Deduped via
 *     OutletDocument.lastExpiryReminderDaysOut so each threshold fires once.
 *
 *  2. Auto-suspend — a CRITICAL required outlet document that has expired
 *     PAST its DocumentTypeConfig.gracePeriodDays window takes the outlet
 *     offline (adminStatus SUSPENDED_COMPLIANCE, clearance PENDING_DOCUMENTS,
 *     vendor + scoped admins notified). It comes back automatically when the
 *     renewed document is approved (admin.outletDocument.service).
 *
 * Non-CRITICAL (LOW/MEDIUM) expired documents are surfaced (the outlet's
 * Documents panel shows them) but never auto-act — a human decides, same as
 * the vendor-account compliance framework.
 *
 * SETUP: call startOutletComplianceCron() once at server start.
 */
export function startOutletComplianceCron(): ReturnType<typeof cron.schedule> {
  const expression = `0 */${DOCUMENT_EXPIRY_CRON_INTERVAL_HOURS} * * *`

  const task = cron.schedule(expression, async () => {
    try {
      const now = new Date()
      const countries = await prisma.country.findMany({ where: { status: "ACTIVE" }, select: { id: true } })
      let reminders = 0
      let suspensions = 0

      for (const { id: countryId } of countries) {
        const docs = await prisma.outletDocument.findMany({
          where: {
            supersededAt: null,
            status      : { in: ["APPROVED", "EXPIRED"] },
            expiryDate  : { not: null },
            outlet      : { deletedAt: null, vendor: { countryId, deletedAt: null } },
          },
          take  : MAX_OUTLET_COMPLIANCE_SCAN,
          select: {
            id: true, status: true, expiryDate: true, lastExpiryReminderDaysOut: true, documentTypeId: true,
            documentType: { select: { name: true, complianceSeverity: true, gracePeriodDays: true } },
            outlet: {
              select: {
                id: true, name: true, adminStatus: true, vendorId: true, cityId: true,
                vendor: { select: { businessEmail: true, countryId: true } },
              },
            },
          },
        })

        for (const doc of docs) {
          const expiry = doc.expiryDate as Date
          const daysOut = Math.ceil((expiry.getTime() - now.getTime()) / DAY_MS)
          const severity = doc.documentType.complianceSeverity as "LOW" | "MEDIUM" | "CRITICAL"
          const critical = severity === "CRITICAL"
          const graceEndsAt = new Date(expiry.getTime() + doc.documentType.gracePeriodDays * DAY_MS)

          const target: OutletComplianceTarget = {
            outletId       : doc.outlet.id,
            outletName     : doc.outlet.name,
            vendorId       : doc.outlet.vendorId,
            vendorEmail    : doc.outlet.vendor.businessEmail,
            countryId      : doc.outlet.vendor.countryId,
            cityId         : doc.outlet.cityId,
            documentTypeName: doc.documentType.name,
            severity,
            expiryDate     : expiry,
            daysOut,
            graceEndsAt    : critical ? graceEndsAt : null,
          }

          // ── Auto-suspend ──────────────────────────────────────────────
          if (critical && now > graceEndsAt && doc.outlet.adminStatus === "ACTIVE") {
            await prisma.outlet.update({
              where: { id: doc.outlet.id },
              data : {
                adminStatus         : "SUSPENDED_COMPLIANCE",
                adminSuspendedAt     : now,
                adminSuspensionReason: `${doc.documentType.name} expired on ${expiry.toISOString().slice(0, 10)} (past grace)`,
              },
            })
            await recomputeOutletClearance(doc.outlet.id)
            auditService.log({
              adminUserId: SYSTEM_USER_ID,
              action     : "outlet.auto_suspended_compliance",
              entityType : "Outlet",
              entityId   : doc.outlet.id,
              changes    : { before: { adminStatus: "ACTIVE" }, after: { adminStatus: "SUSPENDED_COMPLIANCE" } },
              metadata   : { documentTypeId: doc.documentTypeId, source: "outlet-compliance-cron" },
            })
            void notifyVendorOutletCompliance("SUSPENDED", target)
            void notifyAdminsOutletAutoSuspended(target)
            suspensions++
            continue // suspension notice replaces the reminder
          }

          // ── Escalating reminder ───────────────────────────────────────
          const applicable = OUTLET_DOC_EXPIRY_REMINDER_THRESHOLDS.filter((t) => daysOut <= t)
          const tightest = applicable.length ? Math.min(...applicable) : null
          if (
            tightest != null &&
            (doc.lastExpiryReminderDaysOut == null || tightest < doc.lastExpiryReminderDaysOut)
          ) {
            void notifyVendorOutletCompliance(daysOut < 1 ? "EXPIRED_GRACE" : "EXPIRING", target)
            await prisma.outletDocument.update({
              where: { id: doc.id },
              data : { lastExpiryReminderDaysOut: tightest },
            })
            reminders++
          }
        }
      }

      if (reminders || suspensions) {
        cronLog.info({ reminders, suspensions, at: now.toISOString() }, "Outlet compliance reconciled")
      }
    } catch (err) {
      cronLog.error({ err }, "outlet-compliance-cron failed")
    }
  })

  cronLog.info({ expression }, "Outlet compliance cron scheduled")
  return task
}
