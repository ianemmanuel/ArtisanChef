import { describe, it, expect } from "vitest"
import { buildVendorSessionResponse } from "./vendor.session.service"
import type { VendorContext } from "@repo/types/backend"

/*
 * buildVendorSessionResponse is a pure transform — no DB. goLiveStatus is
 * deliberately null here; the session controller attaches the authoritative
 * getVendorGoLiveStatus result for an ACTIVE vendor (needs a DB call, kept
 * out of the pure transform — same pattern as the admin session).
 */

const baseUser: VendorContext["user"] = {
  id: "vu-1", email: "v@example.com", isActive: true, isBanned: false, banReason: null, bannedAt: null,
}

describe("buildVendorSessionResponse", () => {
  it("passes lifecycle fields straight through and defaults goLiveStatus to null", () => {
    const ctx: VendorContext = { user: baseUser, application: null, account: null, state: "NOT_STARTED" }
    expect(buildVendorSessionResponse(ctx)).toEqual({
      state        : "NOT_STARTED",
      vendorUser   : baseUser,
      application  : null,
      vendorAccount: null,
      goLiveStatus : null,
    })
  })

  it("carries an ACTIVE account through with goLiveStatus still null (controller fills it)", () => {
    const account = {
      id: "va-1", status: "ACTIVE" as const, countryId: "c1", vendorTypeId: "vt1",
      legalBusinessName: "Acme", suspensionReason: null, suspendedAt: null, suspensionUntil: null,
    }
    const res = buildVendorSessionResponse({ user: baseUser, application: null, account, state: "ACTIVE" })
    expect(res.vendorAccount).toBe(account)
    expect(res.state).toBe("ACTIVE")
    expect(res.goLiveStatus).toBeNull()
  })
})
