-- AlterTable
ALTER TABLE "VendorApplication"
  ADD COLUMN "termsVersion" TEXT,
  ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
