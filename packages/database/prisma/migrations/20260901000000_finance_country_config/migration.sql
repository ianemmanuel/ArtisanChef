/*
  Finance Phase 1B — per-country financial configuration.

  Purely additive, non-destructive:
    - New `CountryProviderAccount` table — "Kenya uses THIS Flutterwave
      account in THIS environment". Append-only by policy (retire via
      status = DISABLED, never hard-deleted — historical financial records
      will attribute to a specific account id). Secrets are NOT stored
      here; `secretAlias` is a non-secret pointer.
    - New `CountryFinancialConfig` table (1:1 with Country) — currency
      choice, the pointer to the active provider account, the
      collections/payouts operational switches, and the explicit lifecycle
      status. NOT versioned.
    - New enums `PaymentEnvironment`, `CountryFinancialConfigStatus`,
      `CountryProviderAccountStatus`.

  Does NOT touch Country, Currency, PaymentProvider, PaymentMethod,
  CountryPaymentMethod, or VendorPayoutAccount. The
  CountryPaymentMethod -> CountryProviderAccount link is deferred to
  Phase 1C.

  Application-level invariants NOT expressible here (enforced in the
  finance service, inside a transaction):
    - at most one CountryProviderAccount per country with status = ACTIVE
    - config -> ACTIVE requires a valid currency + ACTIVE provider account
      + environment compatible with the deployment
    - enabledCapabilities must be a subset of the provider's capabilities
*/

-- CreateEnum
CREATE TYPE "PaymentEnvironment" AS ENUM ('TEST', 'LIVE');

-- CreateEnum
CREATE TYPE "CountryFinancialConfigStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "CountryProviderAccountStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateTable
CREATE TABLE "CountryProviderAccount" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "paymentProviderId" TEXT NOT NULL,
    "environment" "PaymentEnvironment" NOT NULL,
    "secretAlias" TEXT NOT NULL,
    "enabledCapabilities" "PaymentProviderCapability"[],
    "accountLabel" TEXT,
    "externalAccountId" TEXT,
    "status" "CountryProviderAccountStatus" NOT NULL DEFAULT 'DRAFT',
    "activatedAt" TIMESTAMP(3),
    "activatedByAdminId" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "suspendedByAdminId" TEXT,
    "suspensionReason" TEXT,
    "disabledAt" TIMESTAMP(3),
    "disabledByAdminId" TEXT,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryProviderAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryFinancialConfig" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "currencyCode" TEXT,
    "activeProviderAccountId" TEXT,
    "collectionsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "CountryFinancialConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "activatedAt" TIMESTAMP(3),
    "activatedByAdminId" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "suspendedByAdminId" TEXT,
    "suspensionReason" TEXT,
    "disabledAt" TIMESTAMP(3),
    "disabledByAdminId" TEXT,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryFinancialConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CountryProviderAccount_countryId_status_idx" ON "CountryProviderAccount"("countryId", "status");

-- CreateIndex
CREATE INDEX "CountryProviderAccount_paymentProviderId_idx" ON "CountryProviderAccount"("paymentProviderId");

-- CreateIndex
CREATE INDEX "CountryProviderAccount_status_idx" ON "CountryProviderAccount"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CountryFinancialConfig_countryId_key" ON "CountryFinancialConfig"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "CountryFinancialConfig_activeProviderAccountId_key" ON "CountryFinancialConfig"("activeProviderAccountId");

-- CreateIndex
CREATE INDEX "CountryFinancialConfig_status_idx" ON "CountryFinancialConfig"("status");

-- CreateIndex
CREATE INDEX "CountryFinancialConfig_currencyCode_idx" ON "CountryFinancialConfig"("currencyCode");

-- AddForeignKey
ALTER TABLE "CountryProviderAccount" ADD CONSTRAINT "CountryProviderAccount_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryProviderAccount" ADD CONSTRAINT "CountryProviderAccount_paymentProviderId_fkey" FOREIGN KEY ("paymentProviderId") REFERENCES "PaymentProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryFinancialConfig" ADD CONSTRAINT "CountryFinancialConfig_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryFinancialConfig" ADD CONSTRAINT "CountryFinancialConfig_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryFinancialConfig" ADD CONSTRAINT "CountryFinancialConfig_activeProviderAccountId_fkey" FOREIGN KEY ("activeProviderAccountId") REFERENCES "CountryProviderAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
