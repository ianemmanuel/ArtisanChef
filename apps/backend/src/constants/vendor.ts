//* Vendor constants
// These are constants related to the vendor module.

export const OUTLET_PROXIMITY_DEGREES = 0.00045

export const MAX_TEMP_CLOSURE_DAYS = 7

// How often the cron job that auto-reopens outlets should run (in minutes).
export const OUTLET_REOPEN_CRON_INTERVAL_MINUTES = 5

// How often the document-expiry job runs (in hours). Expiry doesn't need
// minute-level freshness — a document that expired a few hours ago is
// still "expired" for operational purposes, so this runs far less often
// than the outlet-reopen cron.
export const DOCUMENT_EXPIRY_CRON_INTERVAL_HOURS = 6

// Default lookahead window for the ERP's cross-vendor "expiring soon"
// queue when no per-document-type expiryWarningDays is being applied
// (that precision is used on the single-vendor compliance summary
// instead — see getVendorAccount's compliance field).
export const DEFAULT_EXPIRY_LOOKAHEAD_DAYS = 30

// getComplianceOverview computes MISSING-document issues in application
// code (vendor × required-document-type diff), not SQL — these cap how
// much it scans per request so the computation stays bounded at
// admin-tool scale. If a deployment's vendor count grows well past this,
// the natural next step is a materialized/scheduled compliance snapshot
// rather than raising the cap indefinitely.
export const MAX_COMPLIANCE_VENDOR_SCAN = 1500
export const MAX_COMPLIANCE_DOCUMENT_SCAN = 3000

// Roadmap Phase 2 (CLAUDE.md) — a compliance case sitting OPEN
// (unclaimed, not yet escalated) this long gets auto-escalated by
// compliance-case-sync.job.ts, so a stale issue nobody's touched
// eventually reaches the senior-review pool instead of sitting
// invisible forever.
export const COMPLIANCE_CASE_STALE_DAYS = 7

// Roadmap "compliance case workflow refinement" (CLAUDE.md) — a softer,
// earlier nudge than COMPLIANCE_CASE_STALE_DAYS' auto-escalation: a case
// still OPEN (unclaimed) past this many hours gets an in-app
// AdminNotification sent to designated staff (VENDORS_COMPLIANCE_RECEIVE_STALE_ALERT
// holders, country-scoped to the vendor's own country), once per case
// (see VendorComplianceCase.staleNotifiedAt). Independent of the 7-day
// auto-escalation — this doesn't change the case's status at all.
export const COMPLIANCE_CASE_STALE_NOTIFY_HOURS = 24