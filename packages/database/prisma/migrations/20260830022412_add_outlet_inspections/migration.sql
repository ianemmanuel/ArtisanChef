-- CreateEnum
CREATE TYPE "OutletInspectionPolicy" AS ENUM ('NONE', 'MEAL_PLAN_ONLY', 'ALL');

-- CreateEnum
CREATE TYPE "OutletInspectionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'PASSED', 'FAILED', 'WAIVED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VendorNotificationType" ADD VALUE 'OUTLET_INSPECTION_SCHEDULED';
ALTER TYPE "VendorNotificationType" ADD VALUE 'OUTLET_INSPECTION_PASSED';
ALTER TYPE "VendorNotificationType" ADD VALUE 'OUTLET_INSPECTION_FAILED';
ALTER TYPE "VendorNotificationType" ADD VALUE 'OUTLET_INSPECTION_CANCELLED';

-- AlterTable
ALTER TABLE "Country" ADD COLUMN     "outletInspectionPolicy" "OutletInspectionPolicy" NOT NULL DEFAULT 'MEAL_PLAN_ONLY';

-- CreateTable
CREATE TABLE "OutletInspection" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "status" "OutletInspectionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledFor" TIMESTAMP(3),
    "scheduledByAdminId" TEXT,
    "inspectorAdminId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "checklist" JSONB,
    "findings" TEXT,
    "failureReasons" TEXT[],
    "waiveReason" TEXT,
    "photos" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutletInspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutletInspection_outletId_idx" ON "OutletInspection"("outletId");

-- CreateIndex
CREATE INDEX "OutletInspection_status_idx" ON "OutletInspection"("status");

-- CreateIndex
CREATE INDEX "OutletInspection_scheduledFor_idx" ON "OutletInspection"("scheduledFor");

-- AddForeignKey
ALTER TABLE "OutletInspection" ADD CONSTRAINT "OutletInspection_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
