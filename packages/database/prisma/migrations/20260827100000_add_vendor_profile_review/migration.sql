/*
  Warnings:

  Vendor public profile moderation — mirrors Outlet's reviewStatus/
  flagReasons/flaggedAt convention (profanity/impersonation flagging on
  create/update, admin approve-or-reject-with-reason). Purely additive —
  new columns with safe defaults, one new enum, one new enum value.

*/
-- CreateEnum
CREATE TYPE "ProfileReviewStatus" AS ENUM ('AUTO_APPROVED', 'FLAGGED', 'MANUALLY_APPROVED', 'MANUALLY_REJECTED');

-- AlterEnum
ALTER TYPE "VendorNotificationType" ADD VALUE 'PROFILE_REJECTED';

-- AlterTable
ALTER TABLE "VendorProfile"
  ADD COLUMN "reviewStatus" "ProfileReviewStatus" NOT NULL DEFAULT 'AUTO_APPROVED',
  ADD COLUMN "flagReasons" TEXT[],
  ADD COLUMN "flaggedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedByAdminId" TEXT,
  ADD COLUMN "rejectionReason" TEXT;

-- CreateIndex
CREATE INDEX "VendorProfile_reviewStatus_idx" ON "VendorProfile"("reviewStatus");
