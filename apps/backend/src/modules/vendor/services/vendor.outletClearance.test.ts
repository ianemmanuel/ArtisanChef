import { describe, it, expect } from "vitest"
import {
  selectEnforcedCriticalRequired,
  outletCriticalDocumentsAllClear,
  computeOutletCriticalDocuments,
  type OutletDocRequirement,
  type OutletDocState,
} from "./vendor.outletClearance"

/*
 * All three functions are pure — every input is supplied here, no DB. They
 * back recomputeOutletClearance / getOutletCriticalDocuments (outlet
 * document service) and resolveInitialClearance (outlet service).
 */

const FUTURE = new Date(Date.now() + 90 * 86_400_000)
const PAST   = new Date(Date.now() - 1 * 86_400_000)

function req(overrides: Partial<OutletDocRequirement> = {}): OutletDocRequirement {
  return {
    id                : "dt-1",
    name              : "Food Handling Certificate",
    isRequired        : true,
    complianceSeverity: "CRITICAL",
    enforcedFrom      : null,
    vendorTypeConfigs : [],
    ...overrides,
  }
}

function doc(overrides: Partial<OutletDocState> = {}): OutletDocState {
  return { documentTypeId: "dt-1", status: "APPROVED", expiryDate: null, ...overrides }
}

describe("selectEnforcedCriticalRequired", () => {
  it("keeps a required CRITICAL requirement with no enforcedFrom", () => {
    expect(selectEnforcedCriticalRequired([req()])).toHaveLength(1)
  })

  it("drops non-CRITICAL severities", () => {
    expect(selectEnforcedCriticalRequired([req({ complianceSeverity: "MEDIUM" }), req({ complianceSeverity: "LOW" })])).toHaveLength(0)
  })

  it("drops a CRITICAL type that isn't required", () => {
    expect(selectEnforcedCriticalRequired([req({ isRequired: false })])).toHaveLength(0)
  })

  it("honours a vendor-type-specific isRequired override over the type default", () => {
    expect(selectEnforcedCriticalRequired([req({ isRequired: false, vendorTypeConfigs: [{ isRequired: true }] })])).toHaveLength(1)
    expect(selectEnforcedCriticalRequired([req({ isRequired: true, vendorTypeConfigs: [{ isRequired: false }] })])).toHaveLength(0)
  })

  it("excludes a requirement whose enforcedFrom is still in the future", () => {
    expect(selectEnforcedCriticalRequired([req({ enforcedFrom: FUTURE })])).toHaveLength(0)
  })

  it("includes a requirement whose enforcedFrom has already passed", () => {
    expect(selectEnforcedCriticalRequired([req({ enforcedFrom: PAST })])).toHaveLength(1)
  })
})

describe("outletCriticalDocumentsAllClear", () => {
  it("no critical requirements → clear", () => {
    expect(outletCriticalDocumentsAllClear([], [])).toBe(true)
  })

  it("approved + unexpired → clear", () => {
    expect(outletCriticalDocumentsAllClear([req()], [doc({ expiryDate: FUTURE })])).toBe(true)
  })

  it("missing document → not clear", () => {
    expect(outletCriticalDocumentsAllClear([req()], [])).toBe(false)
  })

  it("pending review → not clear", () => {
    expect(outletCriticalDocumentsAllClear([req()], [doc({ status: "PENDING" })])).toBe(false)
  })

  it("approved but expired → not clear", () => {
    expect(outletCriticalDocumentsAllClear([req()], [doc({ expiryDate: PAST })])).toBe(false)
  })

  it("every requirement must be satisfied", () => {
    const reqs = [req({ id: "a" }), req({ id: "b" })]
    expect(outletCriticalDocumentsAllClear(reqs, [{ documentTypeId: "a", status: "APPROVED", expiryDate: null }])).toBe(false)
  })
})

describe("computeOutletCriticalDocuments", () => {
  it("maps every document state to an itemised status", () => {
    const reqs = [
      req({ id: "missing" }),
      req({ id: "withdrawn" }),
      req({ id: "rejected" }),
      req({ id: "pending" }),
      req({ id: "approved" }),
      req({ id: "expired-status" }),
      req({ id: "expired-date" }),
    ]
    const docs: OutletDocState[] = [
      { documentTypeId: "withdrawn", status: "WITHDRAWN", expiryDate: null },
      { documentTypeId: "rejected", status: "REJECTED", expiryDate: null },
      { documentTypeId: "pending", status: "PENDING", expiryDate: null },
      { documentTypeId: "approved", status: "APPROVED", expiryDate: FUTURE },
      { documentTypeId: "expired-status", status: "EXPIRED", expiryDate: null },
      { documentTypeId: "expired-date", status: "APPROVED", expiryDate: PAST },
    ]
    const byId = Object.fromEntries(computeOutletCriticalDocuments(reqs, docs).map((d) => [d.documentTypeId, d.status]))
    expect(byId).toEqual({
      missing       : "MISSING",
      withdrawn     : "MISSING",
      rejected      : "REJECTED",
      pending       : "PENDING_REVIEW",
      approved      : "APPROVED",
      "expired-status": "EXPIRED",
      "expired-date"  : "EXPIRED",
    })
  })

  it("returns one row per critical requirement, carrying its name", () => {
    const rows = computeOutletCriticalDocuments([req({ id: "x", name: "Health Permit" })], [])
    expect(rows).toEqual([{ documentTypeId: "x", name: "Health Permit", status: "MISSING" }])
  })
})
