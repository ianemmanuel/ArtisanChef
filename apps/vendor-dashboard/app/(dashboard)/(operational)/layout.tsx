import { requireOperationalAccess } from "@/lib/vendor/guards"

/*
 * Guard for the operational area — the dashboard and the (still-placeholder)
 * meals / meal-plans / orders / subscriptions routes. Entry requires an
 * ACTIVE, selling-ready vendor; anyone else is bounced to "/" (which
 * re-routes to /setup, onboarding, or the account-status notice). This is a
 * UX boundary — each operational backend endpoint, once it exists, enforces
 * its own lifecycle/readiness requirement regardless.
 */
export default async function OperationalLayout({ children }: { children: React.ReactNode }) {
  await requireOperationalAccess()
  return <>{children}</>
}
