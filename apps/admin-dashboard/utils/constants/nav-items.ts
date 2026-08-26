import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Users,
  Truck,
  HeadphonesIcon,
  Landmark,
  ShieldCheck,
  Settings,
  UtensilsCrossed,
  BarChart3,
  Star,
  type LucideIcon,
  Building2,
  Flag,
  FileCheck2,
  Briefcase,
  Tag,
  Power,
  TrendingUp,
  UserPlus,
  UserCog,
  History,
  PieChart,
  ShieldAlert,
  Scale,
  CreditCard,
} from "lucide-react"
import { AdminPermissions, type AdminPermissionKey } from "@repo/types/admin-app"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
  // Hidden for admins whose scope tier is CITY — a city-scoped admin has
  // no country-level rollup to see, so the link is removed rather than
  // shown-then-403'd.
  hideForCityTier?: boolean
  // Hidden unless scope tier is GLOBAL — mirrors a hard backend rule
  // (e.g. country activation), not just a permission check.
  requiresGlobalTier?: boolean
  // Hidden unless the signed-in admin holds this permission — used for
  // Identity & Access, which only super_admin/identity_admin ever hold
  // any admin_users:*/audit_logs:* permission for (requireIdentityAccess
  // enforces the same thing on the backend; this just keeps the link from
  // ever appearing for a role that would only get redirected on click).
  requiredPermission?: AdminPermissionKey
}

export interface NavSection {
  title: string
  items: NavItem[]
}

/**
 * navSections — used by SidebarNav.
 * Grouped to match the light theme reference image layout.
 * Section titles are shown in expanded mode, hidden when collapsed.
 * In collapsed mode, items are shown as icon-only with tooltip labels.
 */
export const navSections: NavSection[] = [
  {
    title: "General",
    items: [
      { label: "Overview",   href: "/overview",   icon: LayoutDashboard },
    ],
  },
  {
    // Document types moved under Countries (they're country configuration,
    // not a vendor concept — see /countries/[slug]/documents) — no
    // "Document Types" entry here anymore. Vendor Categories (formerly
    // "Vendor Types") also isn't here — see the section below for why.
    title: "Vendors",
    items: [
      { label: "Home",         href: "/vendors",              icon: Store },
      { label: "Applications", href: "/vendors/applications", icon: FileCheck2 },
      { label: "Accounts",     href: "/vendors/accounts",     icon: Briefcase },
      { label: "Compliance",   href: "/vendors/compliance",   icon: ShieldAlert, requiredPermission: AdminPermissions.VENDORS_COMPLIANCE_READ },
      { label: "Appeals",      href: "/vendors/appeals",      icon: Scale,       requiredPermission: AdminPermissions.VENDORS_APPEALS_READ },
      { label: "Revenue",      href: "/vendors/revenue",      icon: TrendingUp },
    ],
  },
  {
    // Deliberately its own top-level section, not nested under Vendors or
    // Countries. It's reference/catalog data used across the whole vendor-
    // management surface (applications, accounts, onboarding), not an
    // instance record like a vendor or application, and not pure geography
    // config like Country/City — VendorType is a global entity, not owned
    // by any one country (see admin.vendorType.service.ts). Read access
    // (vendor_ops, country/city-scoped) must reach it without the
    // requiresGlobalTier + SETTINGS_GEOGRAPHY_WRITE gate the whole
    // Countries section carries, or a country-scoped reviewer would lose
    // visibility into vendor categories entirely — nesting under Countries
    // would silently do exactly that. Gated only on the read permission;
    // write actions (create/suspend/edit) are further gated inside the
    // page itself to global-scope admins holding the write permission.
    title: "Vendor Categories",
    items: [
      { label: "Home",     href: "/vendor-categories",          icon: Tag,        requiredPermission: AdminPermissions.SETTINGS_VENDOR_TYPES_READ },
      { label: "Adoption", href: "/vendor-categories/adoption", icon: PieChart,   requiredPermission: AdminPermissions.SETTINGS_VENDOR_TYPES_READ },
      { label: "Revenue",  href: "/vendor-categories/revenue",  icon: TrendingUp, requiredPermission: AdminPermissions.SETTINGS_VENDOR_TYPES_READ },
    ],
  },
  {
    // Roadmap "Payment gateway infrastructure" (CLAUDE.md, 2026-08-26) —
    // same "own top-level section" reasoning as Vendor Categories above:
    // this is a global catalog (PaymentMethod), not owned by any one
    // country. Per-country activation lives on each country's own page,
    // not here. READ is enough to see the link; every mutation still
    // requires GLOBAL scope regardless of permission (see
    // admin.paymentMethod.service.ts's assertGlobalScope) — a country-
    // scoped finance/operations_admin can view but never gets action buttons.
    title: "Payment Gateways",
    items: [
      { label: "Home", href: "/payment-gateways", icon: CreditCard, requiredPermission: AdminPermissions.FINANCE_PAYMENT_METHODS_READ },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Orders",     href: "/orders",     icon: ShoppingBag },
      { label: "Customers",  href: "/customers",  icon: Users },
      { label: "Meal Plans", href: "/meal-plans", icon: UtensilsCrossed },
      { label: "Deliveries", href: "/deliveries", icon: Truck },
    ],
  },
  {
    // Countries (launch configuration — activation readiness, vendor
    // types, document types) is restricted to super_admin and the
    // (currently global-only) operations_admin role. Every item here
    // gates on SETTINGS_GEOGRAPHY_WRITE — today only those two roles
    // hold it — matching the same permission the backend enforces for
    // every mutation on these pages (see admin.country.routes.ts).
    title: "Countries",
    items: [
      { label: "Home",        href: "/countries",            icon: Flag,       requiresGlobalTier: true, requiredPermission: AdminPermissions.SETTINGS_GEOGRAPHY_WRITE },
      { label: "Revenue",     href: "/countries/revenue",     icon: TrendingUp, requiresGlobalTier: true, requiredPermission: AdminPermissions.SETTINGS_GEOGRAPHY_WRITE },
      { label: "Launch Queue", href: "/countries/activation",  icon: Power,      requiresGlobalTier: true, requiredPermission: AdminPermissions.SETTINGS_GEOGRAPHY_WRITE },
    ],
  },
  {
    title: "Cities",
    items: [
      { label: "Home", href: "/cities", icon: Building2 },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Analytics",  href: "/analytics",  icon: BarChart3 },
      { label: "Reviews",    href: "/reviews",    icon: Star },
    ],
  },
  {
    title: "Identity & Access",
    items: [
      { label: "Home",   href: "/identity",        icon: ShieldCheck, requiredPermission: AdminPermissions.ADMIN_USERS_PROFILES_READ },
      { label: "Create", href: "/identity/new",     icon: UserPlus,   requiredPermission: AdminPermissions.ADMIN_USERS_ACCOUNTS_CREATE },
      { label: "Manage", href: "/identity/manage",  icon: UserCog,    requiredPermission: AdminPermissions.ADMIN_USERS_PROFILES_READ },
      { label: "Audit",  href: "/identity/audit",   icon: History,    requiredPermission: AdminPermissions.AUDIT_LOGS_ALL_READ },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Payments",   href: "/payments",   icon: Landmark },
      { label: "Support",    href: "/support",    icon: HeadphonesIcon },
      { label: "Settings",   href: "/settings",   icon: Settings },
    ],
  },
]