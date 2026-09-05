import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  CreditCard,
  Salad,
  Rocket,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  href?: string;
  type: 'link' | 'dropdown';
  items?: SubItem[];
}

export interface SubItem {
  label: string;
  href: string;
}

/*
 * The operational sidebar (rendered only under (dashboard)/(operational),
 * which already requires a selling-ready vendor). Account configuration —
 * payout, profile, outlets, documents — lives in its own /setup area with
 * its own navigation, reachable here via the single "Setup" entry.
 *
 * Only links to routes that actually exist; full business functionality
 * (meals, orders, analytics) is a later phase.
 */

const SETUP_ITEM: NavItem = { icon: Rocket, label: 'Setup', href: '/setup', type: 'link' };

const operationalNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', type: 'link' },
  { icon: Salad, label: 'Meals', href: '/meals', type: 'link' },
  { icon: Package, label: 'Meal Plans', href: '/meal-plans', type: 'link' },
  { icon: ShoppingBag, label: 'Orders', href: '/orders', type: 'link' },
  { icon: CreditCard, label: 'Subscriptions', href: '/subscriptions', type: 'link' },
];

export function navItemsFor(sellingReady: boolean): NavItem[] {
  return sellingReady ? [...operationalNavItems, SETUP_ITEM] : [SETUP_ITEM];
}
