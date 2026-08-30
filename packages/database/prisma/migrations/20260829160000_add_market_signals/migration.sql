/*
  Warnings:

  Market signals (stage 4) — supply/demand collected ahead of operating
  somewhere, to inform zone creation / level promotion. New: MarketSignal
  table, MarketSignalType + MarketSignalStatus enums. Purely additive.

*/
-- CreateEnum
CREATE TYPE "MarketSignalType" AS ENUM ('VENDOR_INTEREST', 'CUSTOMER_INTEREST');

-- CreateEnum
CREATE TYPE "MarketSignalStatus" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');

-- CreateTable
CREATE TABLE "MarketSignal" (
    "id" TEXT NOT NULL,
    "type" "MarketSignalType" NOT NULL,
    "cityId" TEXT NOT NULL,
    "zoneId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "withinCityBoundary" BOOLEAN NOT NULL DEFAULT false,
    "vendorAccountId" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "note" TEXT,
    "source" TEXT,
    "status" "MarketSignalStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedByAdminId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketSignal_cityId_type_status_idx" ON "MarketSignal"("cityId", "type", "status");

-- CreateIndex
CREATE INDEX "MarketSignal_zoneId_idx" ON "MarketSignal"("zoneId");

-- CreateIndex
CREATE INDEX "MarketSignal_status_idx" ON "MarketSignal"("status");

-- AddForeignKey
ALTER TABLE "MarketSignal" ADD CONSTRAINT "MarketSignal_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketSignal" ADD CONSTRAINT "MarketSignal_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketSignal" ADD CONSTRAINT "MarketSignal_vendorAccountId_fkey" FOREIGN KEY ("vendorAccountId") REFERENCES "VendorAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
