import { requireSetupAccess } from "@/lib/vendor/guards"
import { SetupNavbar } from "@/components/setup/SetupNavbar"
import { SetupFooter } from "@/components/setup/SetupFooter"

/*
 * The vendor setup area — "get your business ready to sell". Deliberately
 * separate from the operational app under (dashboard)/(operational): setup
 * prepares a vendor for selling, the dashboard operates the business once
 * they're selling-ready.
 *
 * requireSetupAccess() gates the whole subtree on an authenticated ACTIVE
 * vendor (readiness is NOT required — a not-ready vendor lives here, and a
 * ready one can still come back to manage payout / profile / outlets). It's
 * a UX boundary; every backend mutation these pages call re-enforces its own
 * lifecycle/ownership rules regardless.
 *
 * The layout is intentionally light — a slim top nav, the content, and a
 * minimal footer. No operational chrome (no sidebar, no Add Meal, no
 * notifications, no theme toggle).
 */
export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  await requireSetupAccess()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SetupNavbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
      <SetupFooter />
    </div>
  )
}
