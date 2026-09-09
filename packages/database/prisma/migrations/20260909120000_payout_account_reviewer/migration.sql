-- Who last reviewed a payout account (approve OR reject), mirroring
-- VendorApplication.reviewedById/reviewedAt. A rejection previously recorded
-- no reviewer on the row — only in the audit log.
ALTER TABLE "VendorPayoutAccount" ADD COLUMN "reviewedById" TEXT;
ALTER TABLE "VendorPayoutAccount" ADD COLUMN "reviewedAt" TIMESTAMP(3);
