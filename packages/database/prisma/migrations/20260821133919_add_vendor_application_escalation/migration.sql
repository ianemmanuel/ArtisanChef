-- AlterTable
ALTER TABLE "VendorApplication" ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "escalatedByAdminId" TEXT,
ADD COLUMN     "escalationReason" TEXT;
