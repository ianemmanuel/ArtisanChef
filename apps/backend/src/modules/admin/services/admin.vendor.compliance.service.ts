import { prisma, DocumentStatus, type DocumentComplianceSeverity } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/errors/ApiError"
import { getCountryIdFromSlug } from "../helpers/get-country-id.helper"
import { DEFAULT_EXPIRY_LOOKAHEAD_DAYS, MAX_COMPLIANCE_VENDOR_SCAN, MAX_COMPLIANCE_DOCUMENT_SCAN } from "@/constants/vendor"
import { buildVendorScopeFilter } from "./admin.vendor.service"
import { getAllowedDocumentTypes } from "@/modules/vendor/services/vendor.document.service"
import { auditService } from "@/services/audit"
import { sendEmail } from "@/lib/email/mailer"
import { buildComplianceNoticeEmail } from "@/lib/email/templates/compliance-notice"
import { toCsv } from "@/lib/csv"
import { assertClaimedByActor } from "./admin.vendor.compliance-case.service"

/*
 * Cross-vendor document-expiry visibility for the ERP. Deliberately
 * separate from admin.vendor.service.ts (already large) — this is one
 * narrow concern (compliance/expiry), not a general vendor-document
 * subsystem, and doesn't touch the document-review workflow at all.
 *
 * Scoped to VendorDocument only — OutletDocument is out of scope here,
 * matching the current phase's explicit deferral of outlet
 * administration. The document requirement/type system itself
 * (DocumentTypeConfig) is unchanged; this only reads it.
 */

//* Same scope-filter shape as admin.vendor.service.ts's buildVendorScopeFilter,
//* but through the vendor relation (VendorDocument -> VendorAccount) rather
//* than a direct countryId column. A nested relation filter like this also
//* naturally excludes documents with no vendor yet (still application-only).
function buildDocumentVendorScopeFilter(scope: AdminScopeContext, requestedCountryId?: string, search?: string) {
  const vendorWhere: Record<string, unknown> = {}
  if (scope.isGlobal) {
    if (requestedCountryId) vendorWhere.countryId = requestedCountryId
  } else {
    const allowedCountries = requestedCountryId && scope.countryIds.includes(requestedCountryId)
      ? [requestedCountryId]
      : scope.countryIds
    vendorWhere.countryId = { in: allowedCountries }
  }
  if (search) vendorWhere.legalBusinessName = { contains: search, mode: "insensitive" }

  // A nested relation filter object — even {} — still requires the relation
  // to exist, same effect as the explicit isNot: null below. Kept explicit
  // for the no-filter case since VendorDocument.vendorId is nullable
  // (application-only documents with no vendor yet must never appear here).
  if (Object.keys(vendorWhere).length === 0) return { vendor: { isNot: null } }
  return { vendor: vendorWhere }
}

export interface ComplianceListParams {
  countrySlug?   : string
  documentTypeId?: string
  search?        : string
  withinDays?    : number
  page?          : number
  pageSize?      : number
}

const documentInclude = {
  documentType: { select: { id: true, name: true, expiryWarningDays: true } },
  vendor: { select: { id: true, legalBusinessName: true, countryId: true, status: true } },
} as const

/*
 * Documents approaching expiry, across every vendor the actor can see.
 * Uses a flat `withinDays` lookahead (default DEFAULT_EXPIRY_LOOKAHEAD_DAYS)
 * rather than each document type's own expiryWarningDays — a per-type SQL
 * window isn't worth the complexity for a cross-vendor list; the
 * single-vendor compliance summary (getVendorAccount) uses the precise
 * per-type window instead, where the dataset is small enough to filter
 * in application code.
 */
export async function getExpiringDocuments(scope: AdminScopeContext, params: ComplianceListParams = {}) {
  const { withinDays = DEFAULT_EXPIRY_LOOKAHEAD_DAYS, page = 1, pageSize = 20 } = params
  const countryId = params.countrySlug ? await getCountryIdFromSlug(params.countrySlug, scope) : undefined
  const skip = (page - 1) * pageSize

  const now     = new Date()
  const horizon = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000)

  const where = {
    ...buildDocumentVendorScopeFilter(scope, countryId),
    supersededAt: null,
    status      : DocumentStatus.APPROVED,
    expiryDate  : { gte: now, lte: horizon },
  }

  const [documents, total] = await Promise.all([
    prisma.vendorDocument.findMany({
      where, skip, take: pageSize,
      orderBy: { expiryDate: "asc" },
      include: documentInclude,
    }),
    prisma.vendorDocument.count({ where }),
  ])

  return { documents, total, page, pageSize, totalPages: Math.ceil(total / pageSize), withinDays }
}

/*
 * Documents already past expiry. Matches on expiryDate directly rather
 * than relying solely on DocumentStatus.EXPIRED, so this stays correct
 * even if the expiry job (admin-document-expiry cron) hasn't run yet or
 * is temporarily disabled — status is a cache of this, not the source
 * of truth for "is this expired".
 */
export async function getExpiredDocuments(scope: AdminScopeContext, params: ComplianceListParams = {}) {
  const { page = 1, pageSize = 20 } = params
  const countryId = params.countrySlug ? await getCountryIdFromSlug(params.countrySlug, scope) : undefined
  const skip = (page - 1) * pageSize
  const now  = new Date()

  const where = {
    ...buildDocumentVendorScopeFilter(scope, countryId),
    supersededAt: null,
    status      : { in: [DocumentStatus.APPROVED, DocumentStatus.EXPIRED] },
    expiryDate  : { lt: now },
  }

  const [documents, total] = await Promise.all([
    prisma.vendorDocument.findMany({
      where, skip, take: pageSize,
      orderBy: { expiryDate: "asc" },
      include: documentInclude,
    }),
    prisma.vendorDocument.count({ where }),
  ])

  return { documents, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

//* Unified cross-vendor compliance list — powers /vendors/compliance.
//* getExpiringDocuments/getExpiredDocuments above stay as-is (still routed,
//* kept for API stability); this covers a strictly larger problem (adds
//* MISSING-document detection, which has no VendorDocument row to query at
//* all, plus severity/grace-period/waiver overlay) so it's a separate
//* computation rather than a wrapper around either.

export type ComplianceIssueStatus = "MISSING" | "EXPIRED" | "EXPIRING_SOON" | "WAIVED"
export type ComplianceIssueKind   = "MISSING" | "EXPIRED" | "EXPIRING_SOON"

export interface ComplianceCaseInfo {
  id                    : string
  status                : "OPEN" | "CLAIMED" | "ESCALATED" | "RESOLVED" | "WAIVED"
  /** When this case was first opened — powers the age/SLA indicator on /vendors/compliance (Roadmap Phase 2, CLAUDE.md). */
  createdAt             : Date
  assignedReviewerId    : string | null
  assignedReviewerName  : string | null
  assignedAt            : Date | null
  escalatedByAdminId    : string | null
  escalatedByAdminName  : string | null
  escalatedAt           : Date | null
  escalationReason      : string | null
  /** True only while the CURRENT assignment was claimed directly out of the open escalation pool — gates whether the current owner may escalate again. See VendorComplianceCase's schema comment. */
  claimedFromEscalation : boolean
}

export interface ComplianceIssueRow {
  /** A real VendorDocument id, or `missing:{vendorId}:{documentTypeId}` — there is no row to key by for a MISSING issue. */
  id           : string
  issueStatus  : ComplianceIssueStatus
  /** The original trigger kind — stable even once issueStatus flips to WAIVED, since that's what VendorComplianceCase.issueType keys on. */
  caseKind     : ComplianceIssueKind
  severity     : DocumentComplianceSeverity
  /** Past expiry but still within the document type's gracePeriodDays — a softer variant of EXPIRED, not its own top-level status. */
  inGracePeriod: boolean
  expiryDate   : Date | null
  documentType : { id: string; name: string }
  vendor       : { id: string; legalBusinessName: string; countryId: string; status: string }
  waiver?      : { id: string; reason: string; expiresAt: Date; grantedByAdminId: string }
  /** The claim/escalate workflow case for this issue, if one has been opened yet — see admin.vendor.compliance-case.service.ts. */
  case?        : ComplianceCaseInfo
}

export interface ComplianceOverviewParams extends ComplianceListParams {
  /** Omit for every status combined. */
  status?: ComplianceIssueStatus
  /** "mine" | "unclaimed" | "escalated" — same semantics as listApplications' queue filter, layered on top of status. */
  queue? : string
  actorId?: string
}

const SEVERITY_RANK: Record<DocumentComplianceSeverity, number> = { CRITICAL: 0, MEDIUM: 1, LOW: 2 }
const STATUS_RANK: Record<ComplianceIssueStatus, number> = { EXPIRED: 0, MISSING: 1, EXPIRING_SOON: 2, WAIVED: 3 }

interface DetectParams {
  countryId?     : string
  documentTypeId?: string
  search?        : string
  /** Restrict to exactly one vendor — used by getVendorComplianceIssues (the vendor detail page's Compliance section). Scope/ownership must already be asserted by the caller when this is set. */
  vendorId?      : string
}

/*
 * The shared detection core — every MISSING/EXPIRED/EXPIRING_SOON
 * candidate (with active waivers already overlaid as WAIVED), unsorted
 * and unpaginated. Used by both getComplianceOverview (cross-vendor,
 * bounded scan) and getVendorComplianceIssues (one vendor, no scan cap
 * needed). Splitting this out is what fixed a real bug: the vendor
 * detail page's Compliance section used to only ever look at documents
 * that already existed, so a vendor missing a required document entirely
 * showed "no compliance issues" — same blind spot getComplianceOverview
 * had before MISSING detection existed.
 */
export async function detectComplianceCandidates(scope: AdminScopeContext, params: DetectParams): Promise<ComplianceIssueRow[]> {
  const { countryId, documentTypeId, search, vendorId } = params
  const now = new Date()

  //* 1. Document-based candidates (EXPIRED / EXPIRING_SOON) — classified
  //* precisely per document type's own expiryWarningDays/gracePeriodDays.
  const rawDocs = await prisma.vendorDocument.findMany({
    where: {
      ...(vendorId ? { vendorId } : buildDocumentVendorScopeFilter(scope, countryId, search)),
      supersededAt: null,
      expiryDate  : { not: null },
      status      : { in: [DocumentStatus.APPROVED, DocumentStatus.EXPIRED] },
      ...(documentTypeId ? { documentTypeId } : {}),
    },
    take: vendorId ? undefined : MAX_COMPLIANCE_DOCUMENT_SCAN,
    orderBy: { expiryDate: "asc" },
    include: {
      documentType: { select: { id: true, name: true, expiryWarningDays: true, gracePeriodDays: true, complianceSeverity: true } },
      vendor: { select: { id: true, legalBusinessName: true, countryId: true, status: true } },
    },
  })

  const docIssues: ComplianceIssueRow[] = []
  for (const doc of rawDocs) {
    if (!doc.vendor || !doc.expiryDate) continue
    const expiryDate = doc.expiryDate
    let issueStatus: ComplianceIssueStatus | null = null
    let inGracePeriod = false
    if (expiryDate >= now) {
      const warnFrom = new Date(expiryDate.getTime() - doc.documentType.expiryWarningDays * 86_400_000)
      if (now >= warnFrom) issueStatus = "EXPIRING_SOON"
    } else {
      const graceUntil = new Date(expiryDate.getTime() + doc.documentType.gracePeriodDays * 86_400_000)
      inGracePeriod = now <= graceUntil
      issueStatus = "EXPIRED"
    }
    if (!issueStatus) continue
    docIssues.push({
      id: doc.id, issueStatus, caseKind: issueStatus, severity: doc.documentType.complianceSeverity, inGracePeriod,
      expiryDate, documentType: { id: doc.documentType.id, name: doc.documentType.name }, vendor: doc.vendor,
    })
  }

  //* 2. MISSING candidates — vendor x required-document-type diff. Reuses
  //* the vendor module's own requirement resolver (getAllowedDocumentTypes)
  //* rather than re-deriving "no DocumentTypeVendorType rows = required for
  //* every vendor type in the country" here — same rule the live
  //* onboarding flow already enforces (vendor.document.service.ts).
  const scanVendors = await prisma.vendorAccount.findMany({
    where: vendorId
      ? { id: vendorId, deletedAt: null }
      : {
          deletedAt: null,
          ...buildVendorScopeFilter(scope, countryId),
          ...(search ? { legalBusinessName: { contains: search, mode: "insensitive" } } : {}),
        },
    take: vendorId ? undefined : MAX_COMPLIANCE_VENDOR_SCAN,
    select: { id: true, legalBusinessName: true, countryId: true, vendorTypeId: true, status: true },
  })

  const missingIssues: ComplianceIssueRow[] = []
  if (scanVendors.length > 0) {
    const requiredCache = new Map<string, Awaited<ReturnType<typeof getAllowedDocumentTypes>>>()
    const requiredIdSet = new Set<string>()
    for (const v of scanVendors) {
      const cacheKey = `${v.countryId}:${v.vendorTypeId}`
      if (!requiredCache.has(cacheKey)) {
        requiredCache.set(cacheKey, await getAllowedDocumentTypes({ countryId: v.countryId, vendorTypeId: v.vendorTypeId }))
      }
      for (const dt of requiredCache.get(cacheKey)!) {
        const isRequired = dt.isRequired && (dt.vendorTypeConfigs.length === 0 || dt.vendorTypeConfigs[0]!.isRequired)
        if (isRequired) requiredIdSet.add(dt.id)
      }
    }

    const requiredIds = documentTypeId ? [documentTypeId].filter((id) => requiredIdSet.has(id)) : [...requiredIdSet]
    const satisfiedRows = requiredIds.length > 0
      ? await prisma.vendorDocument.findMany({
          where: {
            vendorId: { in: scanVendors.map((v) => v.id) },
            documentTypeId: { in: requiredIds },
            supersededAt: null,
            status: DocumentStatus.APPROVED,
          },
          select: { vendorId: true, documentTypeId: true },
        })
      : []
    const satisfied = new Set(satisfiedRows.map((r) => `${r.vendorId}|${r.documentTypeId}`))

    for (const v of scanVendors) {
      const allowed = requiredCache.get(`${v.countryId}:${v.vendorTypeId}`)!
      for (const dt of allowed) {
        const isRequired = dt.isRequired && (dt.vendorTypeConfigs.length === 0 || dt.vendorTypeConfigs[0]!.isRequired)
        if (!isRequired) continue
        if (documentTypeId && dt.id !== documentTypeId) continue
        // Rollout window not reached yet — see DocumentTypeConfig.enforcedFrom.
        if (dt.enforcedFrom && dt.enforcedFrom > now) continue
        if (satisfied.has(`${v.id}|${dt.id}`)) continue
        missingIssues.push({
          id: `missing:${v.id}:${dt.id}`,
          issueStatus: "MISSING",
          caseKind: "MISSING",
          severity: dt.complianceSeverity,
          inGracePeriod: false,
          expiryDate: null,
          documentType: { id: dt.id, name: dt.name },
          vendor: { id: v.id, legalBusinessName: v.legalBusinessName, countryId: v.countryId, status: v.status },
        })
      }
    }
  }

  //* 3. Waivers — overlay onto whichever candidates they match. A waived
  //* issue is excluded from the urgent counts, but not deleted from the
  //* list — it stays visible (and auditable) under the Waived tab.
  const allCandidates = [...docIssues, ...missingIssues]
  const vendorIdsInvolved = [...new Set(allCandidates.map((c) => c.vendor.id))]
  const activeWaivers = vendorIdsInvolved.length > 0
    ? await prisma.vendorComplianceWaiver.findMany({
        where: { vendorId: { in: vendorIdsInvolved }, revokedAt: null, expiresAt: { gt: now } },
        select: { id: true, vendorId: true, documentTypeId: true, reason: true, expiresAt: true, grantedByAdminId: true },
      })
    : []
  const waiverByKey = new Map(activeWaivers.map((w) => [`${w.vendorId}|${w.documentTypeId}`, w]))

  for (const c of allCandidates) {
    const waiver = waiverByKey.get(`${c.vendor.id}|${c.documentType.id}`)
    if (waiver) {
      c.issueStatus = "WAIVED"
      c.waiver = waiver
    }
  }

  return allCandidates
}

/*
 * Overlays claim/escalate workflow state (VendorComplianceCase) onto
 * candidates that already have one — joined on (vendorId, documentTypeId,
 * caseKind), the same triple claimComplianceCase/escalateComplianceCase
 * key on. Only non-RESOLVED cases are considered live; a resolved case
 * simply isn't attached (the issue itself wouldn't still be a live
 * candidate if it were truly fixed — reconciliation keeps these in sync,
 * see jobs/vendor/compliance-case-sync.job.ts).
 */
async function attachCaseInfo(candidates: ComplianceIssueRow[]): Promise<void> {
  if (candidates.length === 0) return
  const vendorIds = [...new Set(candidates.map((c) => c.vendor.id))]

  const cases = await prisma.vendorComplianceCase.findMany({
    where: { vendorId: { in: vendorIds }, status: { not: "RESOLVED" } },
    select: {
      id: true, vendorId: true, documentTypeId: true, issueType: true, status: true, createdAt: true,
      assignedReviewerId: true, assignedAt: true,
      escalatedByAdminId: true, escalatedAt: true, escalationReason: true, claimedFromEscalation: true,
    },
  })
  if (cases.length === 0) return

  const adminIds = [...new Set(cases.flatMap((c) => [c.assignedReviewerId, c.escalatedByAdminId]).filter((id): id is string => !!id))]
  const adminNameById = adminIds.length > 0
    ? new Map(
        (await prisma.adminUser.findMany({ where: { id: { in: adminIds } }, select: { id: true, firstName: true, lastName: true } }))
          .map((a) => [a.id, `${a.firstName} ${a.lastName}`.trim()]),
      )
    : new Map<string, string>()

  const caseByKey = new Map(cases.map((c) => [`${c.vendorId}|${c.documentTypeId}|${c.issueType}`, c]))

  for (const c of candidates) {
    const kase = caseByKey.get(`${c.vendor.id}|${c.documentType.id}|${c.caseKind}`)
    if (!kase) continue
    c.case = {
      id: kase.id, status: kase.status, createdAt: kase.createdAt,
      assignedReviewerId: kase.assignedReviewerId, assignedReviewerName: kase.assignedReviewerId ? adminNameById.get(kase.assignedReviewerId) ?? null : null,
      assignedAt: kase.assignedAt,
      escalatedByAdminId: kase.escalatedByAdminId, escalatedByAdminName: kase.escalatedByAdminId ? adminNameById.get(kase.escalatedByAdminId) ?? null : null,
      escalatedAt: kase.escalatedAt, escalationReason: kase.escalationReason,
      claimedFromEscalation: kase.claimedFromEscalation,
    }
  }
}

function sortByUrgency(candidates: ComplianceIssueRow[]): ComplianceIssueRow[] {
  return [...candidates].sort((a, b) => {
    const statusDiff = STATUS_RANK[a.issueStatus] - STATUS_RANK[b.issueStatus]
    if (statusDiff !== 0) return statusDiff
    const sevDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (sevDiff !== 0) return sevDiff
    return (a.expiryDate?.getTime() ?? Infinity) - (b.expiryDate?.getTime() ?? Infinity)
  })
}

/*
 * Shared detect+filter core behind both getComplianceOverview (paginated,
 * for the page) and exportComplianceIssuesCsv (unpaginated, for VM-P2-01's
 * CSV export) — same bounded scan, same queue/status filtering, same
 * urgency sort; the only difference is whether the caller slices a page
 * off the end or takes the whole filtered list.
 */
async function detectAndFilterCandidates(
  scope : AdminScopeContext,
  params: Omit<ComplianceOverviewParams, "page" | "pageSize">,
): Promise<{ filtered: ComplianceIssueRow[]; queued: ComplianceIssueRow[] }> {
  const { status, countrySlug, documentTypeId, search, queue, actorId } = params
  const countryId = countrySlug ? await getCountryIdFromSlug(countrySlug, scope) : undefined

  const allCandidates = await detectComplianceCandidates(scope, { countryId, documentTypeId, search })
  await attachCaseInfo(allCandidates)

  // Same three-pill semantics as listApplications' queue filter — "mine",
  // "unclaimed" (never assigned AND never escalated), "escalated"
  // (escalatedByAdminId set, regardless of whether it's since been
  // claimed from the pool — it stays visible under this pill).
  const queued =
    queue === "mine" && actorId ? allCandidates.filter((c) => c.case?.assignedReviewerId === actorId)
    : queue === "unclaimed"     ? allCandidates.filter((c) => !c.case?.assignedReviewerId && !c.case?.escalatedByAdminId)
    : queue === "escalated"     ? allCandidates.filter((c) => !!c.case?.escalatedByAdminId)
    : allCandidates

  return { filtered: sortByUrgency(status ? queued.filter((c) => c.issueStatus === status) : queued), queued }
}

/*
 * Cross-vendor, filtered, paginated — powers /vendors/compliance. Computed
 * in application code over a bounded scan (MAX_COMPLIANCE_*_SCAN), not
 * paginated in SQL — a MISSING issue has no row to paginate over in the
 * first place. Fine at admin-tool scale; see the constants' comment for
 * what to do if a deployment outgrows it.
 */
export async function getComplianceOverview(scope: AdminScopeContext, params: ComplianceOverviewParams = {}) {
  const { page = 1, pageSize = 20 } = params
  const { filtered, queued } = await detectAndFilterCandidates(scope, params)
  const total = filtered.length
  const skip  = (page - 1) * pageSize

  // Stat-card counts respect the queue narrowing (same reasoning as
  // listApplications' status cards) so they stay consistent with what the
  // table below actually shows — but not the status-tab filter itself,
  // since the tabs' whole job is to show each other's counts.
  return {
    issues: filtered.slice(skip, skip + pageSize),
    total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)),
    missingCount : queued.filter((c) => c.issueStatus === "MISSING").length,
    expiredCount : queued.filter((c) => c.issueStatus === "EXPIRED").length,
    expiringCount: queued.filter((c) => c.issueStatus === "EXPIRING_SOON").length,
    waivedCount  : queued.filter((c) => c.issueStatus === "WAIVED").length,
    affectedVendorCount: new Set(queued.filter((c) => c.issueStatus !== "WAIVED").map((c) => c.vendor.id)).size,
  }
}

/*
 * Roadmap VM-P2-01 (CLAUDE.md) — CSV export of the compliance issue list
 * for a regulator hand-off. Same filters as the page, no pagination (the
 * whole filtered set, still bounded by the same scan caps as everything
 * else in this file) — a CSV export is exactly the case where "give me
 * everything that matches" is the right behavior, unlike the paginated UI.
 */
export async function exportComplianceIssuesCsv(scope: AdminScopeContext, params: Omit<ComplianceOverviewParams, "page" | "pageSize"> = {}): Promise<string> {
  const { filtered } = await detectAndFilterCandidates(scope, params)
  return toCsv(filtered.map((c) => ({
    vendor        : c.vendor.legalBusinessName,
    vendorStatus  : c.vendor.status,
    documentType  : c.documentType.name,
    issueStatus   : c.issueStatus,
    severity      : c.severity,
    inGracePeriod : c.inGracePeriod,
    expiryDate    : c.expiryDate ? c.expiryDate.toISOString().slice(0, 10) : "",
    caseStatus    : c.case?.status ?? "",
    assignedTo    : c.case?.assignedReviewerName ?? "",
    escalatedBy   : c.case?.escalatedByAdminName ?? "",
    waived        : c.waiver ? "true" : "false",
    waiverReason  : c.waiver?.reason ?? "",
    waiverExpires : c.waiver?.expiresAt ? c.waiver.expiresAt.toISOString().slice(0, 10) : "",
  })), [
    { key: "vendor",        label: "Vendor" },
    { key: "vendorStatus",  label: "Vendor Status" },
    { key: "documentType",  label: "Document Type" },
    { key: "issueStatus",   label: "Issue Status" },
    { key: "severity",      label: "Severity" },
    { key: "inGracePeriod", label: "In Grace Period" },
    { key: "expiryDate",    label: "Expiry Date" },
    { key: "caseStatus",    label: "Case Status" },
    { key: "assignedTo",    label: "Assigned To" },
    { key: "escalatedBy",   label: "Escalated By" },
    { key: "waived",        label: "Waived" },
    { key: "waiverReason",  label: "Waiver Reason" },
    { key: "waiverExpires", label: "Waiver Expires" },
  ])
}

/*
 * One vendor's compliance issues — powers the vendor detail page's
 * Compliance section (see admin.vendor.service.ts's getVendorAccount) and
 * the sidebar's "does my scope have open issues" check. Same detection
 * core as getComplianceOverview, just pinned to one vendor and unbounded
 * (no scan cap needed for a single vendor's own required-document set).
 */
export async function getVendorComplianceIssues(vendorId: string, scope: AdminScopeContext): Promise<ComplianceIssueRow[]> {
  const vendor = await prisma.vendorAccount.findUnique({
    where : { id: vendorId },
    select: { id: true, countryId: true, deletedAt: true },
  })
  if (!vendor || vendor.deletedAt) throw new ApiError(404, "Vendor account not found", "NOT_FOUND")
  if (!scope.isGlobal && !scope.countryIds.includes(vendor.countryId)) {
    throw new ApiError(403, "This vendor is outside your scope", "SCOPE_FORBIDDEN")
  }

  const candidates = await detectComplianceCandidates(scope, { vendorId })
  await attachCaseInfo(candidates)
  return sortByUrgency(candidates)
}

/*
 * A lightweight "does this admin's own country have any open compliance
 * issue" check — powers the sidebar's Compliance nav dot. Deliberately
 * reads VendorComplianceCase (cheap, indexed) rather than re-running full
 * detection on every page load — this is exactly what the persistent case
 * table is for. Country-scoped-only (see SidebarNav / getAdminSession): a
 * global admin always has issues somewhere, so the nudge wouldn't mean
 * anything for them the way it does for a country team watching their own
 * patch. Freshness follows the reconciliation job's cadence, not
 * real-time — appropriate for a "subtle glow," not a live counter.
 */
export async function hasOpenComplianceIssuesForCountries(countryIds: string[]): Promise<boolean> {
  if (countryIds.length === 0) return false
  const openCase = await prisma.vendorComplianceCase.findFirst({
    where : { status: { in: ["OPEN", "CLAIMED", "ESCALATED"] }, vendor: { countryId: { in: countryIds } } },
    select: { id: true },
  })
  return !!openCase
}

//* ─── Notify (phase 3) ────────────────────────────────────────────────────
//* Repeatable, unlike suspend — the same issue can be notified about more
//* than once (a reminder), and notifying different vendors for different
//* issues obviously doesn't collide with anything. Writes a
//* VendorNotification (for vendor-dashboard consumption once that's
//* built) and best-effort emails the vendor — a failed/unconfigured email
//* never blocks the notification record or the audit log; see sendEmail.

const NOTIFICATION_TYPE_BY_ISSUE: Record<ComplianceIssueKind, "COMPLIANCE_MISSING_DOCUMENT" | "COMPLIANCE_EXPIRED_DOCUMENT" | "COMPLIANCE_EXPIRING_DOCUMENT"> = {
  MISSING      : "COMPLIANCE_MISSING_DOCUMENT",
  EXPIRED      : "COMPLIANCE_EXPIRED_DOCUMENT",
  EXPIRING_SOON: "COMPLIANCE_EXPIRING_DOCUMENT",
}

export async function notifyVendorAboutComplianceIssue(
  vendorId      : string,
  documentTypeId: string,
  issueType     : ComplianceIssueKind,
  actorId       : string,
  actorScope    : AdminScopeContext,
): Promise<{ sent: boolean }> {
  const vendor = await prisma.vendorAccount.findUnique({
    where : { id: vendorId },
    select: { id: true, countryId: true, legalBusinessName: true, businessEmail: true, deletedAt: true },
  })
  if (!vendor || vendor.deletedAt) throw new ApiError(404, "Vendor account not found", "NOT_FOUND")
  if (!actorScope.isGlobal && !actorScope.countryIds.includes(vendor.countryId)) {
    throw new ApiError(403, "This vendor is outside your scope", "SCOPE_FORBIDDEN")
  }

  const documentType = await prisma.documentTypeConfig.findUnique({
    where : { id: documentTypeId },
    select: { id: true, countryId: true, name: true, complianceSeverity: true },
  })
  if (!documentType || documentType.countryId !== vendor.countryId) {
    throw new ApiError(400, "Document type does not apply to this vendor", "DOCUMENT_TYPE_MISMATCH")
  }

  // 2026-08-26 refinement (CLAUDE.md) — manage actions require the actor
  // to already be the claimed case owner, no "unclaimed = anyone" fallback.
  await assertClaimedByActor(vendorId, documentTypeId, actorId)

  // Re-derive the expiry date server-side rather than trust a client-
  // supplied one — the notify action only needs vendorId/documentTypeId/
  // issueType from the caller, everything else comes from the DB.
  let expiryDate: Date | null = null
  if (issueType !== "MISSING") {
    const doc = await prisma.vendorDocument.findFirst({
      where  : { vendorId, documentTypeId, supersededAt: null, status: { in: [DocumentStatus.APPROVED, DocumentStatus.EXPIRED] }, expiryDate: { not: null } },
      orderBy: { expiryDate: "asc" },
      select : { expiryDate: true },
    })
    expiryDate = doc?.expiryDate ?? null
  }

  const { subject, html, text } = buildComplianceNoticeEmail({
    businessName: vendor.legalBusinessName,
    documentTypeName: documentType.name,
    issueType, severity: documentType.complianceSeverity, expiryDate,
  })

  const [{ sent }] = await Promise.all([
    sendEmail({ to: vendor.businessEmail, subject, html, text }),
    prisma.vendorNotification.create({
      data: {
        vendorId,
        type   : NOTIFICATION_TYPE_BY_ISSUE[issueType],
        title  : subject,
        message: text,
        metadata: { documentTypeId, documentTypeName: documentType.name, issueType, severity: documentType.complianceSeverity },
      },
    }),
    // Best-effort — a case may not exist yet (nobody's claimed/escalated
    // this issue), in which case there's nothing to bump.
    prisma.vendorComplianceCase.updateMany({
      where: { vendorId, documentTypeId, issueType, status: { in: ["OPEN", "CLAIMED", "ESCALATED"] } },
      data : { notifiedCount: { increment: 1 }, lastNotifiedAt: new Date() },
    }),
  ])

  auditService.log({
    adminUserId: actorId,
    action     : "vendor_compliance.notified",
    entityType : "VendorAccount",
    entityId   : vendorId,
    changes    : { after: { documentTypeId, documentTypeName: documentType.name, issueType, emailSent: sent } },
  })

  return { sent }
}

//* ─── Waivers (phase 3) ───────────────────────────────────────────────────
//* An admin-granted exception on one vendor+documentType compliance issue —
//* suppresses it from the urgent counts until expiresAt, without faking the
//* underlying document as approved. See VendorComplianceWaiver in schema.prisma.

export async function createComplianceWaiver(
  vendorId      : string,
  documentTypeId: string,
  input         : { reason: string; expiresAt: Date },
  actorId       : string,
  actorScope    : AdminScopeContext,
) {
  const vendor = await prisma.vendorAccount.findUnique({
    where : { id: vendorId },
    select: { id: true, countryId: true, deletedAt: true },
  })
  if (!vendor || vendor.deletedAt) throw new ApiError(404, "Vendor account not found", "NOT_FOUND")
  if (!actorScope.isGlobal && !actorScope.countryIds.includes(vendor.countryId)) {
    throw new ApiError(403, "This vendor is outside your scope", "SCOPE_FORBIDDEN")
  }

  const documentType = await prisma.documentTypeConfig.findUnique({
    where : { id: documentTypeId },
    select: { id: true, countryId: true, name: true },
  })
  if (!documentType || documentType.countryId !== vendor.countryId) {
    throw new ApiError(400, "Document type does not apply to this vendor", "DOCUMENT_TYPE_MISMATCH")
  }
  if (!input.reason.trim()) throw new ApiError(400, "reason is required", "MISSING_FIELDS")
  if (input.expiresAt <= new Date()) throw new ApiError(400, "Waiver expiry must be in the future", "INVALID_EXPIRY")

  // 2026-08-26 refinement (CLAUDE.md) — must already be the claimed owner.
  await assertClaimedByActor(vendorId, documentTypeId, actorId)

  const waiver = await prisma.vendorComplianceWaiver.create({
    data: { vendorId, documentTypeId, reason: input.reason, expiresAt: input.expiresAt, grantedByAdminId: actorId },
  })

  auditService.log({
    adminUserId: actorId,
    action     : "vendor_compliance.waived",
    entityType : "VendorComplianceWaiver",
    entityId   : waiver.id,
    changes    : { after: { vendorId, documentTypeId, documentTypeName: documentType.name, expiresAt: input.expiresAt, reason: input.reason } },
  })

  return waiver
}

export async function revokeComplianceWaiver(
  waiverId  : string,
  reason    : string | undefined,
  actorId   : string,
  actorScope: AdminScopeContext,
) {
  const waiver = await prisma.vendorComplianceWaiver.findUnique({
    where  : { id: waiverId },
    include: { vendor: { select: { id: true, countryId: true } } },
  })
  if (!waiver) throw new ApiError(404, "Waiver not found", "NOT_FOUND")
  if (!actorScope.isGlobal && !actorScope.countryIds.includes(waiver.vendor.countryId)) {
    throw new ApiError(403, "This vendor is outside your scope", "SCOPE_FORBIDDEN")
  }
  if (waiver.revokedAt) throw new ApiError(400, "Waiver already revoked", "ALREADY_REVOKED")

  // 2026-08-26 refinement (CLAUDE.md) — must already be the claimed owner
  // of whatever case currently exists for this vendor+documentType (the
  // case is WAIVED at this point, not RESOLVED, so assertClaimedByActor's
  // "most recent non-RESOLVED case" lookup finds it correctly).
  await assertClaimedByActor(waiver.vendorId, waiver.documentTypeId, actorId)

  const updated = await prisma.vendorComplianceWaiver.update({
    where: { id: waiverId },
    data : { revokedAt: new Date(), revokedByAdminId: actorId, revokedReason: reason },
  })

  auditService.log({
    adminUserId: actorId,
    action     : "vendor_compliance.waiver_revoked",
    entityType : "VendorComplianceWaiver",
    entityId   : waiverId,
    changes    : { after: { reason } },
  })

  return updated
}

