import type { VendorLifecycleState } from "@repo/types/vendor-app"

/*
 * Single source of truth for "which onboarding route does this
 * lifecycle state belong on." VendorLifecycleState is server-derived
 * (see loadVendorContext.ts) — this is the ONE value the frontend
 * switches routing/navigation on, never a locally-inferred status.
 */
export function onboardingRouteForState(state: VendorLifecycleState): string {
  switch (state) {
    case "NOT_STARTED":
      return "/onboarding/select"
    case "DRAFT":
    case "NEEDS_REVISION":
      return "/onboarding/business"
    case "PENDING_REVIEW":
    case "REJECTED":
      return "/application/status"
    case "ACTIVE":
    case "SUSPENDED":
    case "BANNED":
      // Not onboarding anymore — handled by the caller, which redirects
      // out of /onboarding entirely rather than rendering a step here.
      return "/dashboard"
  }
}

export const ONBOARDING_STEPS = [
  { key: "select", label: "Country & type", path: "/onboarding/select" },
  { key: "requirements", label: "Requirements", path: "/onboarding/requirements" },
  { key: "business", label: "Business details", path: "/onboarding/business" },
  { key: "review", label: "Review & submit", path: "/onboarding/review" },
] as const

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"]
