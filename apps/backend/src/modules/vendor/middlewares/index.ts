import { verifyVendorToken } from "./verifyVendorToken"
import { loadVendorContext } from "./loadVendorContext"
import type { VendorLifecycleState } from "@repo/types/backend"

export { verifyVendorToken } from "./verifyVendorToken"
export { loadVendorContext } from "./loadVendorContext"
export { requireVendorState } from "./requireVendorState"

/*
 * Every lifecycle state except BANNED — pass to requireVendorState(...)
 * on any router that should stay reachable to a vendor regardless of
 * onboarding/account stage, but must still reject a banned identity.
 * (GET /auth/session deliberately does NOT use this — a banned vendor
 * still needs to be able to see that they're banned.)
 */
export const NON_BANNED_STATES: VendorLifecycleState[] = [
  "NOT_STARTED",
  "DRAFT",
  "PENDING_REVIEW",
  "NEEDS_REVISION",
  "REJECTED",
  "ACTIVE",
  "SUSPENDED",
]

/*
 * The composed vendor authentication chain.
 *   verifyVendorToken → loadVendorContext
 *
 * Usage — spread into router.use():
 *   import { vendorAuthChain } from "../middleware"
 *   router.use(...vendorAuthChain)
 *
 * Then gate individual routes with requireVendorState:
 *   router.post("/menu", requireVendorState("ACTIVE"), handler)
 */
export const vendorAuthChain = [
  verifyVendorToken,
  loadVendorContext,
] as const