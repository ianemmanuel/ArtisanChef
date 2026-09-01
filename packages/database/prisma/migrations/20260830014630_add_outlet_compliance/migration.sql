-- AlterEnum
ALTER TYPE "AdminNotificationType" ADD VALUE 'OUTLET_AUTO_SUSPENDED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VendorNotificationType" ADD VALUE 'OUTLET_DOCUMENT_EXPIRING';
ALTER TYPE "VendorNotificationType" ADD VALUE 'OUTLET_SUSPENDED_COMPLIANCE';
ALTER TYPE "VendorNotificationType" ADD VALUE 'OUTLET_COMPLIANCE_RESOLVED';

-- AlterTable
ALTER TABLE "OutletDocument" ADD COLUMN     "lastExpiryReminderDaysOut" INTEGER;
