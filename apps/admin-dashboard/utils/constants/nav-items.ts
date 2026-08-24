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
    // "Document Types" entry here anymore.
    title: "Vendors",
    items: [
      { label: "Home",         href: "/vendors",              icon: Store },
      { label: "Applications", href: "/vendors/applications", icon: FileCheck2 },
      { label: "Accounts",     href: "/vendors/accounts",     icon: Briefcase },
      { label: "Vendor Types", href: "/vendors/vendor-types", icon: Tag },
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