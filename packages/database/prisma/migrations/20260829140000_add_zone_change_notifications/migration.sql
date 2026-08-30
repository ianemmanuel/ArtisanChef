/*
  Warnings:

  Zone-change notifications (stage 3) — a zone's operational status,
  lifecycle, or capability level changing now notifies every vendor with a
  live outlet in that zone, plus scoped admins. Two new values on each of
  AdminNotificationType and VendorNotificationType. Purely additive.

*/
-- AlterEnum
ALTER TYPE "AdminNotificationType" ADD VALUE 'ZONE_STATUS_CHANGED';
ALTER TYPE "AdminNotificationType" ADD VALUE 'ZONE_CAPABILITY_CHANGED';

-- AlterEnum
ALTER TYPE "VendorNotificationType" ADD VALUE 'ZONE_STATUS_CHANGED';
ALTER TYPE "VendorNotificationType" ADD VALUE 'ZONE_CAPABILITY_CHANGED';
