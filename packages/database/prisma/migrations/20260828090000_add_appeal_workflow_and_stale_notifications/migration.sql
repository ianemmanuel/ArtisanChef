/*
  Warnings:

  Vendor-appeal workflow rework — brings VendorAppeal to claim/escalate/
  reassign parity with VendorComplianceCase (new columns, one new enum
  value on AppealStatus). Also adds a stale-flagged notification hook for
  VendorProfile (one new column) and four new AdminNotificationType
  values. Purely additive.

*/
-- AlterEnum
ALTER TYPE "AppealStatus" ADD VALUE 'ESCALATED';

-- AlterEnum
ALTER TYPE "AdminNotificationType" ADD VALUE 'APPEAL_STALE_UNCLAIMED';
ALTER TYPE "AdminNotificationType" ADD VALUE 'APPEAL_ESCALATED';
ALTER TYPE "AdminNotificationType" ADD VALUE 'APPEAL_RESOLVED';
ALTER TYPE "AdminNotificationType" ADD VALUE 'PROFILE_STALE_FLAGGED';

-- AlterTable
ALTER TABLE "VendorAppeal"
  ADD COLUMN "escalatedByAdminId" TEXT,
  ADD COLUMN "escalatedAt" TIMESTAMP(3),
  ADD COLUMN "escalationReason" TEXT,
  ADD COLUMN "claimedFromEscalation" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "staleNotifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VendorProfile"
  ADD COLUMN "staleNotifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "VendorAppeal_escalatedByAdminId_status_idx" ON "VendorAppeal"("escalatedByAdminId", "status");
