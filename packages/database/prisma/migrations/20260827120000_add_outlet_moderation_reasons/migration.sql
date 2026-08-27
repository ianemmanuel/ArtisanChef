/*
  Warnings:

  Admin-side outlet moderation — Outlet already had adminReviewedBy/
  adminSuspendedAt/adminSuspendUntil/adminBannedAt sitting unwired in the
  schema; this adds the reason text columns needed to actually use them
  (mirrors VendorAccount.suspensionReason / VendorProfile.rejectionReason).
  Purely additive, no defaults needed (all nullable).

*/
-- AlterTable
ALTER TABLE "Outlet"
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "adminSuspensionReason" TEXT,
  ADD COLUMN "adminBanReason" TEXT;
