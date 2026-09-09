-- Claim / escalate / reassign for payout-account review — same workflow
-- shape as VendorAppeal and VendorComplianceCase. No new status enum: the
-- workflow state derives from these columns plus verificationStatus.
ALTER TABLE "VendorPayoutAccount" ADD COLUMN "assignedReviewerId" TEXT;
ALTER TABLE "VendorPayoutAccount" ADD COLUMN "assignedAt" TIMESTAMP(3);
ALTER TABLE "VendorPayoutAccount" ADD COLUMN "escalatedByAdminId" TEXT;
ALTER TABLE "VendorPayoutAccount" ADD COLUMN "escalatedAt" TIMESTAMP(3);
ALTER TABLE "VendorPayoutAccount" ADD COLUMN "escalationReason" TEXT;
ALTER TABLE "VendorPayoutAccount" ADD COLUMN "claimedFromEscalation" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "VendorPayoutAccount_assignedReviewerId_idx" ON "VendorPayoutAccount"("assignedReviewerId");
