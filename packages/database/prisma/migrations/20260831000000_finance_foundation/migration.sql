/*
  Finance Phase 1A — foundation.

  Purely additive, non-destructive:
    - New `Currency` reference table (ISO-4217 + minor-unit digits).
    - New `PaymentProvider` catalog table (provider IMPLEMENTATIONS the
      platform knows how to talk to + their declared capabilities). No
      credentials — those stay outside the DB.
    - New `FinanceReferenceStatus` / `PaymentProviderCapability` enums.
    - `Country.currencyCode` nullable FK -> `Currency.code`. The legacy
      `Country.currency` string is UNTOUCHED; the finance seed backfills
      `currencyCode` for every country whose `currency` matches a seeded
      Currency row. `currency` is dropped in a later phase.

  Does NOT touch `PaymentMethod`, `CountryPaymentMethod`, or
  `VendorPayoutAccount` — those are evolved in Phase 1B.
*/

-- CreateEnum
CREATE TYPE "FinanceReferenceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PaymentProviderCapability" AS ENUM ('COLLECTION_CARD', 'COLLECTION_MOBILE_MONEY', 'COLLECTION_BANK_TRANSFER', 'REFUND', 'BANK_ACCOUNT_RESOLUTION', 'PAYOUT_BANK', 'PAYOUT_MOBILE_MONEY', 'WEBHOOKS');

-- AlterTable
ALTER TABLE "Country" ADD COLUMN     "currencyCode" TEXT;

-- CreateTable
CREATE TABLE "Currency" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "minorUnitDigits" INTEGER NOT NULL DEFAULT 2,
    "status" "FinanceReferenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "PaymentProvider" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "FinanceReferenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "capabilities" "PaymentProviderCapability"[],
    "methodTypes" "PaymentMethodType"[],
    "supportedCurrencies" TEXT[],
    "description" TEXT,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Currency_status_idx" ON "Currency"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProvider_code_key" ON "PaymentProvider"("code");

-- CreateIndex
CREATE INDEX "PaymentProvider_status_idx" ON "PaymentProvider"("status");

-- CreateIndex
CREATE INDEX "Country_currencyCode_idx" ON "Country"("currencyCode");

-- AddForeignKey
ALTER TABLE "Country" ADD CONSTRAINT "Country_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE SET NULL ON UPDATE CASCADE;
