import { prisma, Prisma, type PayoutVerificationStatus } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/errors/ApiError"
import { resolveCountryIdInScope } from "@/modules/admin/lib/scope/resolve-country-id"
import { presentPayoutAccount } from "@/modules/vendor/services/vendor.payoutPresentation"
import { canManuallyVerify } from "./admin.vendor.payout.service"

/*
 * Finance-domain, cross-vendor view of vendor payout accounts and their
 * verification state — the operational home for a finance/compliance admin
 * (Finance → Vendor Payout Accounts). READ is gated on FINANCE_PAYOUTS_READ;
 * the verify/reject actions reuse the existing VENDORS_PAYOUT_ACCOUNTS_MANAGE
 * path (admin.vendor.payout.service.ts) so there's exactly one code path and
 * one audit trail per action.
 *
 * Scope: a country-scoped admin only ever sees accounts whose vendor is in
 * their country (enforced in the WHERE clause here — never trusted from a
 * query param). Global admins see all. Every identifier that reaches a
 * client goes through presentPayoutAccount() — the same single masking
 * boundary the vendor endpoints use; a raw account number never leaves the
 * backend.
 */

const LIST_INCLUDE = {
  vendor: {
    select: {
      id: true,
      countryId: true,
      legalBusinessName: true,
      country: { select: { name: true, code: true, currency: true } },
    },
  },
  countryPaymentMethod: {
    include: {
      paymentMethod: { select: { name: true, type: true, code: true } },
      countryProviderAccount: {
        select: { paymentProvider: { select: { name: true } }, environment: true },
      },
    },
  },
} as const

type PayoutRow = Prisma.VendorPayoutAccountGetPayload<{ include: typeof LIST_INCLUDE }>

function maskedIdentifier(masked: Record<string, unknown> | null, row: PayoutRow): string {
  const m = masked ?? {}
  return (
    (typeof m.accountNumber === "string" && m.accountNumber) ||
    (typeof m.iban === "string" && m.iban) ||
    (typeof m.mobileNumber === "string" && m.mobileNumber) ||
    row.paypalEmail ||
    row.stripeAccountId ||
    "—"
  )
}

function toListItem(row: PayoutRow) {
  const presented = presentPayoutAccount(row, { includeRiskSignals: true })
  return {
    id                : row.id,
    vendorId          : row.vendorId,
    vendorName        : row.vendor.legalBusinessName,
    countryName       : row.vendor.country.name,
    countryCode       : row.vendor.country.code,
    currency          : row.vendor.country.currency,
    methodType        : row.countryPaymentMethod.paymentMethod.type,
    methodName        : row.countryPaymentMethod.paymentMethod.name,
    providerName      : row.countryPaymentMethod.countryProviderAccount?.paymentProvider.name ?? null,
    environment       : row.countryPaymentMethod.countryProviderAccount?.environment ?? null,
    bankName          : row.bankName,
    branchName        : row.branchName,
    accountHolderName : row.accountHolderName,
    maskedAccount     : maskedIdentifier(presented.masked as Record<string, unknown> | null, row),
    verificationStatus: row.verificationStatus,
    verificationFailureCode: row.verificationFailureCode,
    verificationMethod: row.verificationMethod,
    failureReason     : row.failureReason,
    riskFlags         : row.riskFlags,
    nameMatchScore    : row.nameMatchScore,
    isActive          : row.isActive,
    isDefault         : row.isDefault,
    verifiedAt        : row.verifiedAt?.toISOString() ?? null,
    createdAt         : row.createdAt.toISOString(),
    updatedAt         : row.updatedAt.toISOString(),
  }
}

export type AdminPayoutAccountListItem = ReturnType<typeof toListItem>

export interface ListPayoutAccountsFilters {
  status?    : PayoutVerificationStatus | "DEACTIVATED"
  countryRef?: string
  search?    : string
  page?      : number
  pageSize?  : number
}

export async function listVendorPayoutAccounts(filters: ListPayoutAccountsFilters, scope: AdminScopeContext) {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20))

  // Country constraint — never trusted from the query param: a country-scoped
  // admin is always pinned to their own countries, and an explicit
  // countryRef is resolved *within* that scope (404s if out of scope).
  const scopedCountryIds = scope.isGlobal ? null : scope.countryIds
  const requestedCountryId = filters.countryRef
    ? await resolveCountryIdInScope(filters.countryRef, scope)
    : null

  const vendorWhere: Prisma.VendorAccountWhereInput = {}
  if (requestedCountryId) vendorWhere.countryId = requestedCountryId
  else if (scopedCountryIds) vendorWhere.countryId = { in: scopedCountryIds }

  const baseWhere: Prisma.VendorPayoutAccountWhereInput =
    Object.keys(vendorWhere).length > 0 ? { vendor: vendorWhere } : {}

  const where: Prisma.VendorPayoutAccountWhereInput = { ...baseWhere }

  // "DEACTIVATED" is a lifecycle state, not a verificationStatus — a
  // soft-deleted / replaced account. Every other filter is over live rows.
  if (filters.status === "DEACTIVATED") {
    where.deletedAt = { not: null }
  } else {
    where.deletedAt = null
    if (filters.status) where.verificationStatus = filters.status
  }

  if (filters.search?.trim()) {
    const q = filters.search.trim()
    // baseWhere.vendor still ANDs against every branch — search only widens
    // *within* the caller's country scope, never past it.
    where.OR = [
      { vendor: { legalBusinessName: { contains: q, mode: "insensitive" } } },
      { bankName: { contains: q, mode: "insensitive" } },
      { accountHolderName: { contains: q, mode: "insensitive" } },
    ]
  }

  const countWhere = baseWhere

  const [rows, total, pending, failed, requiresReview, verified, deactivated] = await Promise.all([
    prisma.vendorPayoutAccount.findMany({
      where,
      include: LIST_INCLUDE,
      orderBy: [{ createdAt: "desc" }],
      skip   : (page - 1) * pageSize,
      take   : pageSize,
    }),
    prisma.vendorPayoutAccount.count({ where }),
    prisma.vendorPayoutAccount.count({ where: { ...countWhere, deletedAt: null, verificationStatus: "PENDING" } }),
    prisma.vendorPayoutAccount.count({ where: { ...countWhere, deletedAt: null, verificationStatus: "FAILED" } }),
    prisma.vendorPayoutAccount.count({ where: { ...countWhere, deletedAt: null, verificationStatus: "REQUIRES_REVIEW" } }),
    prisma.vendorPayoutAccount.count({ where: { ...countWhere, deletedAt: null, verificationStatus: "VERIFIED" } }),
    prisma.vendorPayoutAccount.count({ where: { ...countWhere, deletedAt: { not: null } } }),
  ])

  return {
    accounts: rows.map(toListItem),
    total,
    page,
    pageSize,
    counts: { pending, failed, requiresReview, verified, deactivated },
  }
}

export interface PayoutAccountAuditEntry {
  id       : string
  action   : string
  actor    : string | null
  createdAt : string
  changes  : unknown
  metadata : unknown
}

export async function getVendorPayoutAccountForReview(accountId: string, scope: AdminScopeContext) {
  const row = await prisma.vendorPayoutAccount.findUnique({ where: { id: accountId }, include: LIST_INCLUDE })
  // A soft-deleted account is still viewable for its history (§8) — only
  // scope hides it, and it hides identically to a genuinely missing id.
  if (!row) throw new ApiError(404, "Payout account not found", "NOT_FOUND")
  if (!scope.isGlobal && !scope.countryIds.includes(row.vendor.countryId)) {
    throw new ApiError(404, "Payout account not found", "NOT_FOUND")
  }

  const auditRows = await prisma.auditLog.findMany({
    where  : { entityType: "VendorPayoutAccount", entityId: accountId },
    orderBy: { createdAt: "desc" },
    take   : 50,
    include: { adminUser: { select: { firstName: true, lastName: true, email: true } } },
  })

  const gate = canManuallyVerify(row)

  return {
    account: toListItem(row),
    canVerify: gate.ok,
    verifyBlockedReason: gate.ok ? null : gate.reason,
    audit: auditRows.map((a) => ({
      id      : a.id,
      action  : a.action,
      actor   : a.adminUser ? `${a.adminUser.firstName} ${a.adminUser.lastName}`.trim() || a.adminUser.email : null,
      createdAt: a.createdAt.toISOString(),
      changes : a.changes,
      metadata: a.metadata,
    })) satisfies PayoutAccountAuditEntry[],
  }
}
