'use client';

import { menuItems } from '@/utils/constants/nav-links'
import { SidebarItem } from './SidebarItem'

export function SidebarNav() {
  return (
    <nav className="h-full overflow-y-auto p-4 space-y-1 scrollbar-thin">
      {menuItems.map((item) => (
        <SidebarItem key={item.label} item={item} />
      ))}
    </nav>
  );
}