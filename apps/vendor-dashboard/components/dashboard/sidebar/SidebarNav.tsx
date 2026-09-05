'use client'

import { navItemsFor } from '@/utils/constants/nav-links'
import { useVendorNav } from '@/components/dashboard/VendorNavContext'
import { SidebarItem } from './SidebarItem'

export function SidebarNav() {
  const { sellingReady } = useVendorNav()
  const items = navItemsFor(sellingReady)

  return (
    <nav className="h-full overflow-y-auto px-3 py-4">
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.label}>
            <SidebarItem item={item} />
          </li>
        ))}
      </ul>
    </nav>
  )
}
