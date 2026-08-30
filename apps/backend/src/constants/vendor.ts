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

// Outlet-document expiry reminders — day-thresholds counting down to the
// expiry date. Descending intervals (not a daily blast), matching how
// Uber Eats / DoorDash escalate merchant-document reminders. 0 = the day it
// expires. Past 0 (in the grace window) the outlet-compliance cron keeps
// nudging on each run until the doc is renewed or the outlet auto-suspends.
export const OUTLET_DOC_EXPIRY_REMINDER_THRESHOLDS = [60, 30, 14, 7, 3, 1, 0] as const

// Per-country scan cap for the outlet-compliance cron — same "admin-tool
// scale ceiling, not a claim of unlimited scale" reasoning as the
// MAX_COMPLIANCE_* caps below. A materialized snapshot is the next step if
// a deployment outgrows it.
export const MAX_OUTLET_COMPLIANCE_SCAN = 4000

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

// listApplications' sort=priority mode ranks by status urgency (needs
// action first, terminal last) rather than a single column — Postgres
// can't express that custom bucket order in a plain Prisma orderBy, so it
// scans a bounded window and ranks in application code, same "admin-tool
// scale, documented ceiling" convention as the compliance scan caps above.
export const MAX_APPLICATION_PRIORITY_SCAN = 3000

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

// Appeal workflow rework (2026-08-28) — same "softer, earlier nudge" shape
// as COMPLIANCE_CASE_STALE_NOTIFY_HOURS: an appeal still OPEN (unclaimed)
// past this many hours gets an in-app AdminNotification to designated
// staff (VENDORS_APPEALS_RECEIVE_STALE_ALERT holders, country-scoped),
// once per appeal (see VendorAppeal.staleNotifiedAt).
export const APPEAL_STALE_NOTIFY_HOURS = 24

// An appeal still OPEN (unclaimed) past this many days gets auto-escalated
// (vendor-ops-notifications.job.ts), same mechanism as
// COMPLIANCE_CASE_STALE_DAYS. Deliberately shorter than compliance's 7
// days — an appeal is a formal dispute a vendor is actively waiting on,
// not a routine document-expiry issue, and warrants a tighter SLA.
export const APPEAL_STALE_ESCALATE_DAYS = 5

// A vendor public-profile flag sitting unactioned this long gets an
// in-app AdminNotification to VENDORS_PROFILES_MODERATE holders,
// country-scoped, once per flag (see VendorProfile.staleNotifiedAt).
// Reuses the moderate permission itself as the recipient list — unlike
// appeals/compliance, profile moderation is a single-permission, no-
// claim-workflow action (see admin.vendorProfile.service.ts's doc
// comment), so a dedicated RECEIVE_STALE_ALERT permission would be a
// distinction with no workflow behind it.
export const PROFILE_STALE_NOTIFY_HOURS = 24

//* ===================PAYOUT HARDENING (CLAUDE.md #7)===================

// A vendor adding this many payout accounts (active or since-removed) inside
// PAYOUT_ADD_VELOCITY_WINDOW_DAYS trips the ADD_VELOCITY risk flag and the
// account lands in the admin review queue instead of silent PENDING.
// Legitimate churn — fix a typo, switch banks — sits well under this.
export const PAYOUT_ADD_VELOCITY_MAX = 4
export const PAYOUT_ADD_VELOCITY_WINDOW_DAYS = 7

// bestNameMatch score (0..1) below this trips the NAME_MISMATCH risk flag —
// the account-holder name barely resembles the vendor's legal or owner
// name. 0.5 = "shares half its word set" still passes; a wholly different
// name lands ~0.3. Advisory only; an admin still makes the call.
export const PAYOUT_NAME_MATCH_MIN = 0.5