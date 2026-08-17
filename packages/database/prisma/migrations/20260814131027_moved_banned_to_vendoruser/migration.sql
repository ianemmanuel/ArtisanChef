/*
  Warnings:

  - The values [BANNED] on the enum `VendorStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "VendorStatus_new" AS ENUM ('ACTIVE', 'SUSPENDED');
ALTER TABLE "public"."VendorAccount" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "VendorAccount" ALTER COLUMN "status" TYPE "VendorStatus_new" USING ("status"::text::"VendorStatus_new");
ALTER TYPE "VendorStatus" RENAME TO "VendorStatus_old";
ALTER TYPE "VendorStatus_new" RENAME TO "VendorStatus";
DROP TYPE "public"."VendorStatus_old";
ALTER TABLE "VendorAccount" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropIndex
DROP INDEX "VendorAccount_userId_countryId_key";

-- DropIndex
DROP INDEX "VendorApplication_userId_countryId_key";

-- AlterTable
ALTER TABLE "VendorUser" ADD COLUMN     "banReason" TEXT,
ADD COLUMN     "bannedAt" TIMESTAMP(3),
ADD COLUMN     "isBanned" BOOLEAN NOT NULL DEFAULT false;
