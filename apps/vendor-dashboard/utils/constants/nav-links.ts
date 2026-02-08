import {
  LayoutDashboard,
  Store,
  Users,
  ShoppingBag,
  BarChart3,
  Settings,
  Package,
  TrendingUp,
  CreditCard,
  Bell,
  ChefHat,
  Truck,
  MessageSquare,
  Salad
} from 'lucide-react';

export interface NavItem {
  icon: any;
  label: string;
  href?: string;
  type: 'link' | 'dropdown';
  items?: SubItem[];
}

export interface SubItem {
  label: string;
  href: string;
}

export const menuItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/', type: 'link' },
  { icon: Store, label: 'Vendors', href: '/vendors', type: 'link' },
  {
    icon: ShoppingBag,
    label: 'Orders',
    type: 'dropdown',
    items: [
      { label: 'All Orders', href: '/orders' },
      { label: 'Pending Orders', href: '/orders/pending' },
      { label: 'Completed Orders', href: '/orders/completed' },
      { label: 'Cancelled Orders', href: '/orders/cancelled' },
    ],
  },
  {
    icon: Salad,
    label: 'Meals',
    type: 'dropdown',
    items: [
      { label: 'Create', href: '/meals' },
      { label: 'All meals', href: '/meals/create' },
      { label: 'Archived Meals', href: '/meals/archived' },

    ],
  },
  { icon: Users, label: 'Customers', href: '/customers', type: 'link' },
  {
    icon: ChefHat,
    label: 'Restaurants',
    type: 'dropdown',
    items: [
      { label: 'All Restaurants', href: '/restaurants' },
      { label: 'Applications', href: '/restaurants/applications' },
      { label: 'Reviews', href: '/restaurants/reviews' },
    ],
  },
  { icon: BarChart3, label: 'Analytics', href: '/analytics', type: 'link' },
  { icon: TrendingUp, label: 'Revenue', href: '/revenue', type: 'link' },
  { icon: CreditCard, label: 'Payments', href: '/payments', type: 'link' },
  { icon: Truck, label: 'Delivery', href: '/delivery', type: 'link' },
  { icon: Bell, label: 'Notifications', href: '/notifications', type: 'link' },
  { icon: MessageSquare, label: 'Support', href: '/support', type: 'link' },
  { icon: Settings, label: 'Settings', href: '/settings', type: 'link' },
];