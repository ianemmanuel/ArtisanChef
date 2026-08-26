-- CreateTable
CREATE TABLE "VendorCommissionRateHistory" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "previousRate" DOUBLE PRECISION,
    "newRate" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "changedByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorCommissionRateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorCommissionRateHistory_vendorId_idx" ON "VendorCommissionRateHistory"("vendorId");

-- CreateIndex
CREATE INDEX "VendorCommissionRateHistory_createdAt_idx" ON "VendorCommissionRateHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "VendorCommissionRateHistory" ADD CONSTRAINT "VendorCommissionRateHistory_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
