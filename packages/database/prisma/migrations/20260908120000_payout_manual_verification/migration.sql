-- Manual (document-backed) payout-account verification for markets where no
-- payment provider can resolve a bank account (e.g. Kenya / KES).

-- 1. How a country verifies vendor bank payout accounts.
CREATE TYPE "BankVerificationMode" AS ENUM ('PROVIDER', 'MANUAL');

ALTER TABLE "CountryFinancialConfig"
  ADD COLUMN "bankVerificationMode" "BankVerificationMode" NOT NULL DEFAULT 'PROVIDER';

-- 2. A document scope that anchors to one payout account rather than to a
--    vendor / outlet / city.
ALTER TYPE "DocumentScope" ADD VALUE 'PAYOUT_ACCOUNT';

-- 3. Third anchor on VendorDocument: proof of ownership for one payout
--    account. Nullable — exactly one of applicationId / vendorId /
--    payoutAccountId is set per row.
ALTER TABLE "VendorDocument" ADD COLUMN "payoutAccountId" TEXT;

CREATE INDEX "VendorDocument_payoutAccountId_idx" ON "VendorDocument"("payoutAccountId");

ALTER TABLE "VendorDocument"
  ADD CONSTRAINT "VendorDocument_payoutAccountId_fkey"
  FOREIGN KEY ("payoutAccountId") REFERENCES "VendorPayoutAccount"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
