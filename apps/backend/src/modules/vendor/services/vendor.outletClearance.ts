/*
 * Pure clearance / critical-document logic for OUTLET-scoped documents — no
 * DB, no I/O, every input supplied by the caller (same pure-core split as
 * finance.readiness.compute.ts). The DB-aware wrappers live in
 * vendor.outletDocument.service.ts (recomputeOutletClearance,
 * getOutletCriticalDocuments) and vendor.outlet.service.ts
 * (resolveInitialClearance).
 *
 * An outlet is held at clearanceStatus PENDING_DOCUMENTS while it has ≥1
 * required, CRITICAL-severity, currently-in-force OUTLET document type whose
 * current document isn't APPROVED-and-unexpired. LOW / MEDIUM severity
 * requirements are surfaced elsewhere but never gate go-live.
 *
 * `status` values are compared as string literals rather than importing
 * Prisma's DocumentStatus enum, to keep this module dependency-free (the
 * runtime values are identical).
 */

/** The subset of a DocumentTypeConfig row (+ its vendor-type link) these functions read. */
export interface OutletDocRequirement {
  id                : string
  name              : string
  isRequired        : boolean
  complianceSeverity: string
  enforcedFrom      : Date | null
  vendorTypeConfigs : { isRequired: boolean }[]
}

/** The subset of a current (non-superseded) OutletDocument row these functions read. */
export interface OutletDocState {
  documentTypeId: string
  status        : string
  expiryDate    : Date | null
}

export type OutletCriticalDocumentStatus =
  | "MISSING" | "PENDING_REVIEW" | "APPROVED" | "EXPIRED" | "REJECTED"

export interface OutletCriticalDocument {
  documentTypeId: string
  name          : string
  status        : OutletCriticalDocumentStatus
}

/*
 * The required CRITICAL-severity requirements actually in force right now.
 * A type whose admin-set `enforcedFrom` is still in the future doesn't gate
 * anyone yet — it applies uniformly once that date passes. A vendor-type
 * specific `isRequired` override wins over the document type's own default
 * (same "no DocumentTypeVendorType link = required for every vendor type"
 * rule getAllowedDocumentTypes / getOutletDocumentRequirements enforce).
 */
export function selectEnforcedCriticalRequired<T extends OutletDocRequirement>(
  requirements: T[],
  now: Date = new Date(),
): T[] {
  return requirements.filter(
    (r) =>
      r.complianceSeverity === "CRITICAL" &&
      (r.vendorTypeConfigs[0]?.isRequired ?? r.isRequired) &&
      !(r.enforcedFrom && r.enforcedFrom > now),
  )
}

/** True when every in-force required CRITICAL document is APPROVED and unexpired. */
export function outletCriticalDocumentsAllClear(
  criticalRequired: OutletDocRequirement[],
  currentDocs: OutletDocState[],
  now: Date = new Date(),
): boolean {
  if (criticalRequired.length === 0) return true
  const byType = new Map(currentDocs.map((d) => [d.documentTypeId, d]))
  return criticalRequired.every((r) => {
    const d = byType.get(r.id)
    return !!d && d.status === "APPROVED" && (!d.expiryDate || d.expiryDate > now)
  })
}

/** Itemised status of every in-force required CRITICAL outlet document type. */
export function computeOutletCriticalDocuments(
  criticalRequired: OutletDocRequirement[],
  currentDocs: OutletDocState[],
  now: Date = new Date(),
): OutletCriticalDocument[] {
  const byType = new Map(currentDocs.map((d) => [d.documentTypeId, d]))
  return criticalRequired.map((r) => {
    const d = byType.get(r.id)
    let status: OutletCriticalDocumentStatus
    if (!d || d.status === "WITHDRAWN") status = "MISSING"
    else if (d.status === "REJECTED") status = "REJECTED"
    else if (d.status === "EXPIRED" || (d.expiryDate && d.expiryDate <= now)) status = "EXPIRED"
    else if (d.status === "PENDING") status = "PENDING_REVIEW"
    else if (d.status === "APPROVED") status = "APPROVED"
    else status = "MISSING"
    return { documentTypeId: r.id, name: r.name, status }
  })
}
