-- CreateEnum
CREATE TYPE "PayoutHoldStatus" AS ENUM ('NONE', 'HELD');

-- AlterTable
ALTER TABLE "VendorAccount" ADD COLUMN     "payoutHoldPlacedAt" TIMESTAMP(3),
ADD COLUMN     "payoutHoldPlacedBy" TEXT,
ADD COLUMN     "payoutHoldReason" TEXT,
ADD COLUMN     "payoutHoldStatus" "PayoutHoldStatus" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "VendorPayoutAccount" ADD COLUMN     "accountNumberHash" TEXT,
ADD COLUMN     "maskedDetails" JSONB,
ADD COLUMN     "mobileNumberHash" TEXT,
ADD COLUMN     "nameMatchScore" DOUBLE PRECISION,
ADD COLUMN     "riskFlags" TEXT[];

-- CreateIndex
CREATE INDEX "VendorPayoutAccount_accountNumberHash_idx" ON "VendorPayoutAccount"("accountNumberHash");

-- CreateIndex
CREATE INDEX "VendorPayoutAccount_mobileNumberHash_idx" ON "VendorPayoutAccount"("mobileNumberHash");
