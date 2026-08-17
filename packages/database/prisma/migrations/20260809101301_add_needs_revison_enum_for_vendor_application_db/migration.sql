-- AlterEnum
ALTER TYPE "VendorApplicationStatus" ADD VALUE 'NEEDS_REVISION';

-- AlterTable
ALTER TABLE "VendorApplication" ALTER COLUMN "legalBusinessName" DROP NOT NULL,
ALTER COLUMN "businessEmail" DROP NOT NULL,
ALTER COLUMN "ownerFirstName" DROP NOT NULL,
ALTER COLUMN "ownerLastName" DROP NOT NULL;
