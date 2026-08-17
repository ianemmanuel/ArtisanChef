-- CreateEnum
CREATE TYPE "AdminReviewAvailability" AS ENUM ('AVAILABLE', 'UNAVAILABLE');

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "reviewAvailability" "AdminReviewAvailability" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN     "unavailableFrom" TIMESTAMP(3),
ADD COLUMN     "unavailableUntil" TIMESTAMP(3),
ADD COLUMN     "unavailableReason" TEXT;

-- CreateIndex
CREATE INDEX "AdminUser_reviewAvailability_idx" ON "AdminUser"("reviewAvailability");

-- AlterTable
ALTER TABLE "VendorApplication" ADD COLUMN     "reasonCode" TEXT,
ADD COLUMN     "assignedReviewerId" TEXT,
ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

-- CreateIndex
CREATE INDEX "VendorApplication_assignedReviewerId_status_idx" ON "VendorApplication"("assignedReviewerId", "status");

-- DropIndex
DROP INDEX "AdminActionReason_code_key";

-- AlterTable
ALTER TABLE "AdminActionReason" ADD COLUMN     "countryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AdminActionReason_code_countryId_key" ON "AdminActionReason"("code", "countryId");

-- CreateIndex
CREATE INDEX "AdminActionReason_countryId_idx" ON "AdminActionReason"("countryId");
