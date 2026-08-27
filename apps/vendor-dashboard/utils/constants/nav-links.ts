import {
  LayoutDashboard,
  Store,
  ShoppingBag,
  Settings,
  Package,
  CreditCard,
  Salad,
  FileCheck2,
  Radio,
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
 * Only links to routes that actually exist under app/(dashboard).
 * Full business functionality (meal management, order workflows,
 * analytics) is a later phase — this is the shell's nav, not a promise
 * that those pages are feature-complete.
 */
export const menuItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', type: 'link' },
  { icon: Store, label: 'Outlets', href: '/outlets', type: 'link' },
  { icon: FileCheck2, label: 'Documents', href: '/documents', type: 'link' },
  { icon: Radio, label: 'Profile', href: '/profile', type: 'link' },
  { icon: Salad, label: 'Meals', href: '/meals', type: 'link' },
  { icon: Package, label: 'Meal Plans', href: '/meal-plans', type: 'link' },
  { icon: ShoppingBag, label: 'Orders', href: '/orders', type: 'link' },
  { icon: CreditCard, label: 'Subscriptions', href: '/subscriptions', type: 'link' },
  { icon: Settings, label: 'Settings', href: '/settings', type: 'link' },
];
