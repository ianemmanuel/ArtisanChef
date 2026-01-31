/*
  Warnings:

  - Added the required column `updatedAt` to the `VendorUser` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VendorUser" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "VendorUser_clerkId_idx" ON "VendorUser"("clerkId");

-- CreateIndex
CREATE INDEX "VendorUser_email_idx" ON "VendorUser"("email");
