/*
  Warnings:

  Compliance case workflow + vendor notifications (see
  admin.vendor.compliance-case.service.ts and the VendorComplianceCase /
  VendorNotification model comments). Purely additive — new enums, new
  tables, no changes to existing columns.

*/
-- CreateEnum
CREATE TYPE "ComplianceIssueKind" AS ENUM ('MISSING', 'EXPIRED', 'EXPIRING_SOON');

-- CreateEnum
CREATE TYPE "ComplianceCaseStatus" AS ENUM ('OPEN', 'CLAIMED', 'ESCALATED', 'RESOLVED', 'WAIVED');

-- CreateEnum
CREATE TYPE "VendorNotificationType" AS ENUM ('COMPLIANCE_MISSING_DOCUMENT', 'COMPLIANCE_EXPIRING_DOCUMENT', 'COMPLIANCE_EXPIRED_DOCUMENT', 'COMPLIANCE_CASE_RESOLVED');

-- CreateTable
CREATE TABLE "VendorComplianceCase" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "issueType" "ComplianceIssueKind" NOT NULL,
    "severity" "DocumentComplianceSeverity" NOT NULL,
    "status" "ComplianceCaseStatus" NOT NULL DEFAULT 'OPEN',
    "assignedReviewerId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "escalatedByAdminId" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "escalationReason" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByAdminId" TEXT,
    "resolutionNote" TEXT,
    "notifiedCount" INTEGER NOT NULL DEFAULT 0,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorComplianceCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorNotification" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "type" "VendorNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorComplianceCase_vendorId_idx" ON "VendorComplianceCase"("vendorId");

-- CreateIndex
CREATE INDEX "VendorComplianceCase_documentTypeId_idx" ON "VendorComplianceCase"("documentTypeId");

-- CreateIndex
CREATE INDEX "VendorComplianceCase_status_idx" ON "VendorComplianceCase"("status");

-- CreateIndex
CREATE INDEX "VendorComplianceCase_assignedReviewerId_status_idx" ON "VendorComplianceCase"("assignedReviewerId", "status");

-- CreateIndex
CREATE INDEX "VendorComplianceCase_escalatedByAdminId_status_idx" ON "VendorComplianceCase"("escalatedByAdminId", "status");

-- CreateIndex
CREATE INDEX "VendorNotification_vendorId_idx" ON "VendorNotification"("vendorId");

-- CreateIndex
CREATE INDEX "VendorNotification_vendorId_isRead_idx" ON "VendorNotification"("vendorId", "isRead");

-- CreateIndex
CREATE INDEX "VendorNotification_createdAt_idx" ON "VendorNotification"("createdAt");

-- AddForeignKey
ALTER TABLE "VendorComplianceCase" ADD CONSTRAINT "VendorComplianceCase_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorComplianceCase" ADD CONSTRAINT "VendorComplianceCase_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentTypeConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorNotification" ADD CONSTRAINT "VendorNotification_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
