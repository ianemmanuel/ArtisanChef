-- Notifications for the payout-account review workflow.
ALTER TYPE "AdminNotificationType" ADD VALUE 'PAYOUT_ACCOUNT_ESCALATED';
ALTER TYPE "AdminNotificationType" ADD VALUE 'PAYOUT_ACCOUNT_ASSIGNED';
