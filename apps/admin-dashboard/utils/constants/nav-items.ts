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
  FileText,
  Power,
  TrendingUp,
} from "lucide-react"

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
    title: "Vendors",
    items: [
      { label: "Home",           href: "/vendors",                 icon: Store },
      { label: "Applications",   href: "/vendors/applications",    icon: FileCheck2 },
      { label: "Accounts",       href: "/vendors/accounts",        icon: Briefcase },
      { label: "Vendor Types",   href: "/vendors/vendor-types",    icon: Tag },
      { label: "Document Types", href: "/vendors/document-types",  icon: FileText },
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
    title: "Locations",
    items: [
      { label: "Countries",     href: "/countries", icon: Flag, hideForCityTier: true },
      { label: "Revenue",       href: "/countries/revenue", icon: TrendingUp, hideForCityTier: true },
      { label: "Activation",    href: "/countries/activation", icon: Power, requiresGlobalTier: true },
      { label: "Cities",    href: "/cities",    icon: Building2 },
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
    title: "Administration",
    items: [
      { label: "Payments",   href: "/payments",   icon: Landmark },
      { label: "Support",    href: "/support",    icon: HeadphonesIcon },
      { label: "Access",     href: "/identity",   icon: ShieldCheck },
      { label: "Settings",   href: "/settings",   icon: Settings },
    ],
  },
]