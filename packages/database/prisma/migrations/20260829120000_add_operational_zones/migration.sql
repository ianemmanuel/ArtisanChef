/*
  Warnings:

  Geographic-operations rework, stage 1a — introduces the operational Zone
  (Vendor → Outlet → Zone → City). New: ZoneLevel + ZoneOperationalStatus
  enums, the Zone table, and a nullable Outlet.zoneId FK (SET NULL on zone
  delete — an outlet losing its zone falls back to the REGISTRATION_ONLY
  floor, it is never deleted with the zone).

  Purely additive. No existing column changes. The legacy ServiceArea /
  ServiceAreaMode model is untouched here; migrating off it and populating
  Outlet.zoneId are later stages.

*/
-- CreateEnum
CREATE TYPE "ZoneLevel" AS ENUM ('REGISTRATION_ONLY', 'MARKETPLACE', 'PLATFORM_DELIVERY', 'FULL_OPERATIONS');

-- CreateEnum
CREATE TYPE "ZoneOperationalStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'MAINTENANCE', 'EMERGENCY');

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "boundaries" JSONB NOT NULL,
    "level" "ZoneLevel" NOT NULL DEFAULT 'REGISTRATION_ONLY',
    "levelChangedAt" TIMESTAMP(3),
    "levelChangedByAdminId" TEXT,
    "levelChangeReason" TEXT,
    "operationalStatus" "ZoneOperationalStatus" NOT NULL DEFAULT 'ACTIVE',
    "operationalStatusReason" TEXT,
    "operationalStatusChangedAt" TIMESTAMP(3),
    "operationalStatusChangedById" TEXT,
    "pausedUntil" TIMESTAMP(3),
    "status" "GeoStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Zone_cityId_idx" ON "Zone"("cityId");

-- CreateIndex
CREATE INDEX "Zone_status_idx" ON "Zone"("status");

-- CreateIndex
CREATE INDEX "Zone_level_idx" ON "Zone"("level");

-- CreateIndex
CREATE INDEX "Zone_operationalStatus_idx" ON "Zone"("operationalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_cityId_name_key" ON "Zone"("cityId", "name");

-- AlterTable
ALTER TABLE "Outlet" ADD COLUMN "zoneId" TEXT;

-- CreateIndex
CREATE INDEX "Outlet_zoneId_idx" ON "Outlet"("zoneId");

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
