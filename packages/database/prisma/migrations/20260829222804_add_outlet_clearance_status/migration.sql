-- CreateEnum
CREATE TYPE "OutletClearanceStatus" AS ENUM ('PENDING_DOCUMENTS', 'CLEARED');

-- AlterEnum
ALTER TYPE "OutletAdminStatus" ADD VALUE 'SUSPENDED_COMPLIANCE';

-- AlterTable
ALTER TABLE "Outlet" ADD COLUMN     "clearanceStatus" "OutletClearanceStatus" NOT NULL DEFAULT 'CLEARED',
ADD COLUMN     "clearanceUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Outlet_clearanceStatus_idx" ON "Outlet"("clearanceStatus");
