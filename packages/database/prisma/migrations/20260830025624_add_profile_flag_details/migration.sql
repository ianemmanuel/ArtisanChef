-- AlterEnum
ALTER TYPE "AdminNotificationType" ADD VALUE 'PROFILE_FLAGGED';

-- AlterTable
ALTER TABLE "VendorProfile" ADD COLUMN     "flagDetails" JSONB;
