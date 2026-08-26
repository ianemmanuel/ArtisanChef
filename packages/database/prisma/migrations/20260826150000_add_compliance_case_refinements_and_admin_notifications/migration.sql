/*
  Warnings:

  Compliance case workflow refinement (claim-gating, reassignment,
  terminal-escalation rule, stale-unclaimed alerting) + a new admin-facing
  in-app notification center. Purely additive — new columns with safe
  defaults, one new enum, one new table.

*/
-- AlterTable
ALTER TABLE "VendorComplianceCase"
  ADD COLUMN "claimedFromEscalation" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "staleNotifiedAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "AdminNotificationType" AS ENUM ('COMPLIANCE_CASE_STALE');

-- CreateTable
CREATE TABLE "AdminNotification" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "type" "AdminNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminNotification_adminUserId_idx" ON "AdminNotification"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminNotification_adminUserId_isRead_idx" ON "AdminNotification"("adminUserId", "isRead");

-- CreateIndex
CREATE INDEX "AdminNotification_createdAt_idx" ON "AdminNotification"("createdAt");

-- AddForeignKey
ALTER TABLE "AdminNotification" ADD CONSTRAINT "AdminNotification_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
