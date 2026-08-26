/*
  Warnings:

  Compliance framework phase 2/3 (see admin.vendor.compliance.service.ts):
  - DocumentTypeConfig gains complianceSeverity/gracePeriodDays/enforcedFrom,
    all with defaults that preserve today's behavior (MEDIUM severity, no
    grace period, enforced immediately) for every existing row.
  - New VendorComplianceWaiver table — vendor-scoped exceptions, additive,
    no backfill needed (no waivers exist yet).

*/
-- CreateEnum
CREATE TYPE "DocumentComplianceSeverity" AS ENUM ('LOW', 'MEDIUM', 'CRITICAL');

-- AlterTable
ALTER TABLE "DocumentTypeConfig"
  ADD COLUMN "complianceSeverity" "DocumentComplianceSeverity" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "enforcedFrom" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "VendorComplianceWaiver" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "grantedByAdminId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedByAdminId" TEXT,
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorComplianceWaiver_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorComplianceWaiver_vendorId_idx" ON "VendorComplianceWaiver"("vendorId");

-- CreateIndex
CREATE INDEX "VendorComplianceWaiver_documentTypeId_idx" ON "VendorComplianceWaiver"("documentTypeId");

-- CreateIndex
CREATE INDEX "VendorComplianceWaiver_expiresAt_idx" ON "VendorComplianceWaiver"("expiresAt");

-- AddForeignKey
ALTER TABLE "VendorComplianceWaiver" ADD CONSTRAINT "VendorComplianceWaiver_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorComplianceWaiver" ADD CONSTRAINT "VendorComplianceWaiver_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentTypeConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
