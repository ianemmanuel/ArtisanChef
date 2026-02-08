'use client';

import { Sidebar } from './sidebar/Sidebar'
import { Navbar } from './navbar'
import { StatsCards } from './stats-cards'
import { RevenueChart } from './charts/Revenue'
import { TopVendors } from './top-vendors'
import { RecentOrders } from './tables/RecentOrders'
import { useSidebarStore } from '@/lib/state/sidebar-store'
import { cn } from '@repo/ui/lib/utils'

export function DashboardContent() {
  const { isCollapsed } = useSidebarStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      {/* Main Content Area */}
      <div
        className={cn(
          'min-h-screen transition-all duration-200',
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64' // Updated from lg:ml-16 to lg:ml-20
        )}
      >
        <Navbar />

        <main className="p-4 sm:p-6 space-y-6 max-w-[1920px] mx-auto">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Welcome back! Here's what's happening with your platform today.
            </p>
          </div>

          {/* Stats Cards */}
          <StatsCards />

          {/* Charts Section */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RevenueChart />
            </div>
            <div className="lg:col-span-1">
              <TopVendors />
            </div>
          </div>

          {/* Recent Orders */}
          <RecentOrders />
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-card mt-12">
          <div className="px-4 sm:px-6 py-8 max-w-[1920px] mx-auto">
            <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                    <span className="text-lg font-bold text-primary-foreground">S</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">SELECT</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The ultimate multivendor food delivery platform. Connecting customers with their favorite restaurants.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Platform</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="hover:text-foreground cursor-pointer transition-colors">Dashboard</li>
                  <li className="hover:text-foreground cursor-pointer transition-colors">Vendors</li>
                  <li className="hover:text-foreground cursor-pointer transition-colors">Orders</li>
                  <li className="hover:text-foreground cursor-pointer transition-colors">Analytics</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Support</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="hover:text-foreground cursor-pointer transition-colors">Help Center</li>
                  <li className="hover:text-foreground cursor-pointer transition-colors">Documentation</li>
                  <li className="hover:text-foreground cursor-pointer transition-colors">Contact Us</li>
                  <li className="hover:text-foreground cursor-pointer transition-colors">Terms of Service</li>
                </ul>
              </div>
            </div>

            <div className="border-t border-border mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                © 2025 SELECT. All rights reserved.
              </p>
              <div className="flex gap-4 sm:gap-6 text-sm text-muted-foreground flex-wrap justify-center">
                <span className="hover:text-foreground cursor-pointer transition-colors">Privacy Policy</span>
                <span className="hover:text-foreground cursor-pointer transition-colors">Terms of Service</span>
                <span className="hover:text-foreground cursor-pointer transition-colors">Cookie Policy</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}