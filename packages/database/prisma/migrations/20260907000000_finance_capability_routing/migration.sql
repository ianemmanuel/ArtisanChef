-- Capability-scoped provider routing.
--
-- Before: one CountryFinancialConfig.activeProviderAccountId served every
-- capability, and the service layer enforced "at most one ACTIVE
-- CountryProviderAccount per country".
--
-- After: a country may have MANY ACTIVE provider accounts, one per
-- capability domain. Method-specific business capabilities (collection /
-- payout) route through CountryPaymentMethod.countryProviderAccountId
-- (already present). The country-global bank-account-resolution /
-- verification capability routes through the new, explicit
-- CountryFinancialConfig.bankVerificationProviderAccountId — a composite
-- same-country FK, so it can never point at another country's account.
--
-- The single-ACTIVE invariant lived only in application code
-- (activateProviderAccount) — there is no DB constraint to drop.

-- DropForeignKey
ALTER TABLE "CountryFinancialConfig" DROP CONSTRAINT "CountryFinancialConfig_activeProviderAccountId_fkey";

-- DropIndex
DROP INDEX "CountryFinancialConfig_activeProviderAccountId_key";

-- AlterTable
ALTER TABLE "CountryFinancialConfig" DROP COLUMN "activeProviderAccountId",
ADD COLUMN     "bankVerificationProviderAccountId" TEXT;

-- CreateIndex
CREATE INDEX "CountryFinancialConfig_bankVerificationProviderAccountId_idx" ON "CountryFinancialConfig"("bankVerificationProviderAccountId");

-- AddForeignKey
ALTER TABLE "CountryFinancialConfig" ADD CONSTRAINT "CountryFinancialConfig_bankVerification_fkey" FOREIGN KEY ("bankVerificationProviderAccountId", "countryId") REFERENCES "CountryProviderAccount"("id", "countryId") ON DELETE NO ACTION ON UPDATE NO ACTION;
