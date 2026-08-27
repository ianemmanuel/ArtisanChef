import { ALL_PERMISSION_KEYS, type PermissionKey } from './permissions.data'

// Keys here should match ROLES[].name in roles.data.ts — validated at seed time,
// not at the type level, since role names come from the DB-facing string union.
export const ROLE_POOLS: Record<string, PermissionKey[]> = {
  super_admin: ALL_PERMISSION_KEYS,

  identity_admin: [
    "admin_users:profiles:read",
    "admin_users:accounts:create",
    "admin_users:invitations:send",
    "admin_users:permissions:manage",
    "admin_users:accounts:suspend",
    "admin_users:accounts:reinstate",
    "admin_users:accounts:deactivate",
    "admin_users:roles:assign",
    "admin_users:accounts:manage_availability",
    "audit_logs:all:read",
    "settings:geography:read",
    "vendors:reviewers:manage_availability",
  ],

  operations_admin: [
    "settings:geography:read",
    "settings:geography:write",
    "settings:vendor_types:read",
    "settings:vendor_types:write",
    "settings:documents:read",
    "settings:documents:write",
    "finance:payment_methods:read",
    "finance:payment_methods:manage",
  ],

  finance: [
    "vendors:accounts:read",
    "vendors:payout_accounts:manage",
    "vendors:accounts:commission_manage",
    // Read-only visibility into the vendor-category catalog — needed for
    // /finance/vendor-categories (category names/slugs to pick from), same
    // low-stakes-read reasoning as vendors:accounts:read above. Does NOT
    // include settings:vendor_types:write — finance can see categories,
    // not manage them.
    "settings:vendor_types:read",
    "finance:transactions:read",
    "finance:payouts:read",
    "finance:payouts:approve",
    "finance:payouts:reverse",
    "finance:discounts:read",
    "finance:discounts:create",
    "finance:discounts:deactivate",
    "finance:reports:read",
    "finance:reports:export",
    "finance:payment_methods:read",
    "finance:payment_methods:manage",
    "orders:all:read",
  ],

  vendor_ops: [
    "vendors:accounts:read",
    "vendors:accounts:create",
    "vendors:accounts:suspend",
    "vendors:accounts:reinstate",
    "vendors:accounts:ban",
    "vendors:accounts:export",
    "vendors:accounts:compliance_manage",
    // Roadmap "Finance domain" (CLAUDE.md) — a ceiling-only addition, not a
    // default grant (see loadPermissions.ts: the role pool is what CAN be
    // individually granted, never auto-applied). Lets a super_admin/
    // identity_admin selectively hand finance-report visibility to a
    // specific vendor_ops admin ("regulated" access) without promoting
    // them to the finance role outright.
    "finance:reports:read",
    "vendors:compliance:read",
    "vendors:compliance:claim",
    "vendors:compliance:escalate",
    "vendors:compliance:receive_escalation",
    "vendors:compliance:reassign",
    "vendors:compliance:receive_stale_alert",
    "vendors:payout_accounts:manage",
    "vendors:accounts:commission_manage",
    "vendors:appeals:read",
    "vendors:appeals:manage",
    "vendors:profiles:read",
    "vendors:profiles:moderate",
    "vendors:outlets:read",
    "vendors:outlets:moderate",
    "vendors:applications:read",
    "vendors:applications:review",
    "vendors:applications:approve",
    "vendors:applications:reject",
    "vendors:applications:claim",
    "vendors:applications:reassign",
    "vendors:applications:escalate",
    "vendors:documents:view",
    "finance:discounts:read",
    "orders:all:read",
    "settings:geography:read",
    "settings:documents:read",
    "settings:vendor_types:read",
  ],

  customer_care: [
    "customers:profiles:read",
    "customers:orders:read",
    "customers:orders:refund",
    "customers:accounts:suspend",
    "customers:accounts:reinstate",
    "orders:all:read",
    "vendors:accounts:read",
  ],

  courier_ops: [
    "couriers:profiles:read",
    "couriers:applications:approve",
    "couriers:deliveries:assign",
    "couriers:accounts:suspend",
    "couriers:accounts:reinstate",
    "orders:all:read",
  ],
}