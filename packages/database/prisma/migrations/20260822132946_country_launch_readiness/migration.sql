-- AlterTable
ALTER TABLE "Country" ADD COLUMN     "customerOperationsReadyAt" TIMESTAMP(3),
ADD COLUMN     "customerOperationsReadyById" TEXT,
ADD COLUMN     "readyForCustomerOperations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readyForVendorOnboarding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vendorOnboardingReadyAt" TIMESTAMP(3),
ADD COLUMN     "vendorOnboardingReadyById" TEXT;
