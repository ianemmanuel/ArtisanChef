-- AlterTable
ALTER TABLE "City" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "deactivatedByAdminId" TEXT,
ADD COLUMN     "deactivationReason" TEXT;

-- AlterTable
ALTER TABLE "DocumentTypeConfig" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "deactivatedByAdminId" TEXT,
ADD COLUMN     "deactivationReason" TEXT;
