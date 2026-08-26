/*
  Warnings:

  Roadmap VM-P1-04 (CLAUDE.md) — admin-side appeal/dispute log against a
  rejected application, a suspension, or a ban. Purely additive — new
  enums, one new table, no changes to existing columns.

*/
-- CreateEnum
CREATE TYPE "AppealSubjectType" AS ENUM ('APPLICATION_REJECTION', 'ACCOUNT_SUSPENSION', 'ACCOUNT_BAN');

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'UPHELD', 'OVERTURNED');

-- CreateTable
CREATE TABLE "VendorAppeal" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "vendorId" TEXT,
    "subjectType" "AppealSubjectType" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'OPEN',
    "assignedReviewerId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolvedByAdminId" TEXT,
    "resolutionNote" TEXT,
    "createdByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorAppeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorAppeal_applicationId_idx" ON "VendorAppeal"("applicationId");

-- CreateIndex
CREATE INDEX "VendorAppeal_vendorId_idx" ON "VendorAppeal"("vendorId");

-- CreateIndex
CREATE INDEX "VendorAppeal_status_idx" ON "VendorAppeal"("status");

-- CreateIndex
CREATE INDEX "VendorAppeal_assignedReviewerId_status_idx" ON "VendorAppeal"("assignedReviewerId", "status");

-- AddForeignKey
ALTER TABLE "VendorAppeal" ADD CONSTRAINT "VendorAppeal_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VendorApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAppeal" ADD CONSTRAINT "VendorAppeal_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
