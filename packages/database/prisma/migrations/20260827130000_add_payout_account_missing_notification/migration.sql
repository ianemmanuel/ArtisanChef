/*
  Warnings:

  A single new VendorNotificationType value for the "missing payout
  account" operational compliance signal — see getVendorOperationalIssues
  in admin.vendor.compliance.service.ts. Purely additive.

*/
-- AlterEnum
ALTER TYPE "VendorNotificationType" ADD VALUE 'PAYOUT_ACCOUNT_MISSING';
