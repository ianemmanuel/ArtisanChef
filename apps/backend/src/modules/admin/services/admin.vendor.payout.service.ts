import { prisma, PayoutVerificationStatus } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/errors/ApiError"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"

const serviceLog = logger.child({ module: "admin-vendor-payout-service" })

/*
 * Roadmap Phase 1 (see CLAUDE.md) — the one hard blocker in vendor
 * management: addPayoutAccount (vendor.payout.service.ts) always creates a
 * PENDING account and only ever moves it forward via triggerVerification,
 * which is explicitly a no-op today ("Future: dispatch to a queue...").
 * Nothing anywhere used to move an account to VERIFIED — a vendor could
 * never actually get paid. This is the admin-side manual-verify path;
 * the real provider integration (Stripe/Daraja/etc.) is a separate,
 * later decision, not blocking this fix.
 */

async function loadOwnedAccount(vendorId: string, accountId: string, actorScope: AdminScopeContext) {
  const account = await prisma.vendorPayoutAccount.findUnique({
    where  : { id: accountId },
    include: { vendor: { select: { id: true, countryId: true, legalBusinessName: true } } },
  })
  if (!account || account.deletedAt) throw new ApiError(404, "Payout account not found", "NOT_FOUND")
  if (account.vendorId !== vendorId) throw new ApiError(400, "Payout account does not belong to this vendor", "VENDOR_MISMATCH")
  if (!actorScope.isGlobal && !actorScope.countryIds.includes(account.vendor.countryId)) {
    throw new ApiError(403, "This vendor is outside your scope", "SCOPE_FORBIDDEN")
  }
  return account
}

export async function verifyPayoutAccount(
  vendorId  : string,
  accountId : string,
  actorId   : string,
  actorScope: AdminScopeContext,
) {
  const account = await loadOwnedAccount(vendorId, accountId, actorScope)
  if (account.verificationStatus === PayoutVerificationStatus.VERIFIED) {
    throw new ApiError(400, "Payout account is already verified", "ALREADY_VERIFIED")
  }

  const updated = await prisma.vendorPayoutAccount.update({
    where: { id: accountId },
    data : {
      verificationStatus: PayoutVerificationStatus.VERIFIED,
      verificationMethod: "MANUAL",
      verifiedAt        : new Date(),
      verifiedBy        : actorId,
      failureReason     : null,
    },
  })

  serviceLog.info({ vendorId, accountId, actorId }, "Payout account manually verified")
  auditService.log({
    adminUserId: actorId,
    action     : "vendor_payout_account.verified",
    entityType : "VendorPayoutAccount",
    entityId   : accountId,
    changes    : { before: { verificationStatus: account.verificationStatus }, after: { verificationStatus: "VERIFIED" } },
    metadata   : { vendorId, method: "MANUAL" },
  })

  return updated
}

/*
 * Roadmap VM-P2-02 (CLAUDE.md) — the one concretely useful, cheap fraud
 * signal identified: the same bank account number or mobile money number
 * reused across payout accounts belonging to *different* vendors. Not a
 * scoring engine — a per-account flag, computed on demand for the one
 * vendor being viewed (N small queries, N = that vendor's own payout
 * account count, which is always tiny — never a platform-wide scan).
 * Scoped to the same country only, deliberately: a shared account number
 * across countries is far less actionable, and this avoids any chance of
 * a country-scoped admin inferring another country's vendor data from a
 * cross-country match.
 */
export async function getDuplicatePayoutFlags(
  vendorId : string,
  countryId: string,
): Promise<Map<string, number>> {
  const accounts = await prisma.vendorPayoutAccount.findMany({
    where : { vendorId, deletedAt: null },
    select: { id: true, accountNumber: true, mobileNumber: true },
  })

  const flags = new Map<string, number>()
  for (const acct of accounts) {
    const identifiers = [acct.accountNumber?.trim(), acct.mobileNumber?.trim()].filter((v): v is string => !!v)
    if (identifiers.length === 0) continue

    const dupeCount = await prisma.vendorPayoutAccount.count({
      where: {
        vendorId : { not: vendorId },
        deletedAt: null,
        vendor   : { countryId },
        OR       : identifiers.flatMap((id) => [{ accountNumber: id }, { mobileNumber: id }]),
      },
    })
    if (dupeCount > 0) flags.set(acct.id, dupeCount)
  }
  return flags
}

export async function rejectPayoutAccount(
  vendorId  : string,
  accountId : string,
  reason    : string,
  actorId   : string,
  actorScope: AdminScopeContext,
) {
  if (!reason?.trim()) throw new ApiError(400, "reason is required", "MISSING_FIELDS")

  const account = await loadOwnedAccount(vendorId, accountId, actorScope)
  if (account.verificationStatus === PayoutVerificationStatus.FAILED) {
    throw new ApiError(400, "Payout account is already marked as failed", "ALREADY_FAILED")
  }

  const updated = await prisma.vendorPayoutAccount.update({
    where: { id: accountId },
    data : {
      verificationStatus: PayoutVerificationStatus.FAILED,
      verificationMethod: "MANUAL",
      failureReason     : reason.trim(),
      // A previous verifiedAt/verifiedBy (if this was VERIFIED and is now
      // being revoked) stays as historical fact, not cleared — the audit
      // log entry (with before/after) is the authoritative timeline.
    },
  })

  serviceLog.info({ vendorId, accountId, actorId, reason }, "Payout account rejected")
  auditService.log({
    adminUserId: actorId,
    action     : "vendor_payout_account.rejected",
    entityType : "VendorPayoutAccount",
    entityId   : accountId,
    changes    : { before: { verificationStatus: account.verificationStatus }, after: { verificationStatus: "FAILED", failureReason: reason.trim() } },
    metadata   : { vendorId },
  })

  return updated
}
