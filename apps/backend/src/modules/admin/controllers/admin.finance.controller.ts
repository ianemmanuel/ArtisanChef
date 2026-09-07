import type { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { ApiError } from "@/errors/ApiError"
import { listOutletsForFinance, listCitiesForFinance } from "../services/admin.finance.service"
import { listVendorPayoutAccounts, getVendorPayoutAccountForReview } from "../services/admin.financePayout.service"
import { verifyPayoutAccount, rejectPayoutAccount } from "../services/admin.vendor.payout.service"
import type { PayoutVerificationStatus } from "@repo/db"

export const handleListOutletsForFinance: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { country, city, page, pageSize } = req.query as Record<string, string>

    const data = await listOutletsForFinance(adminScope, {
      countrySlug: country,
      cityId     : city,
      page       : page     ? Number(page)     : undefined,
      pageSize   : pageSize ? Number(pageSize) : undefined,
    })
    return sendSuccess(res, data, "Outlets fetched")
  } catch (err) { next(err) }
}

export const handleListCitiesForFinance: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { country } = req.query as Record<string, string>
    if (!country?.trim()) throw new ApiError(400, "country is required", "MISSING_FIELDS")

    const data = await listCitiesForFinance(adminScope, country)
    return sendSuccess(res, data, "Cities fetched")
  } catch (err) { next(err) }
}

//* ─── Vendor payout accounts — Finance operational review ────────────────

const PAYOUT_STATUSES = new Set(["PENDING", "VERIFIED", "FAILED", "REQUIRES_REVIEW", "DEACTIVATED"])

export const handleListVendorPayoutAccounts: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { status, country, search, page, pageSize } = req.query as Record<string, string>

    const data = await listVendorPayoutAccounts(
      {
        status    : status && PAYOUT_STATUSES.has(status) ? (status as PayoutVerificationStatus | "DEACTIVATED") : undefined,
        countryRef: country?.trim() || undefined,
        search    : search?.trim() || undefined,
        page      : page     ? Number(page)     : undefined,
        pageSize  : pageSize ? Number(pageSize) : undefined,
      },
      adminScope,
    )
    return sendSuccess(res, data, "Vendor payout accounts fetched")
  } catch (err) { next(err) }
}

export const handleGetVendorPayoutAccountForReview: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const data = await getVendorPayoutAccountForReview(req.params.accountId as string, adminScope)
    return sendSuccess(res, data, "Payout account fetched")
  } catch (err) { next(err) }
}

export const handleFinanceVerifyPayoutAccount: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const account = await verifyPayoutAccount(req.params.accountId as string, adminUser.id, adminScope)
    return sendSuccess(res, account, "Payout account verified")
  } catch (err) { next(err) }
}

export const handleFinanceRejectPayoutAccount: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { reason } = req.body as { reason?: string }
    if (!reason?.trim()) throw new ApiError(400, "reason is required", "MISSING_FIELDS")
    const account = await rejectPayoutAccount(req.params.accountId as string, reason, adminUser.id, adminScope)
    return sendSuccess(res, account, "Payout account rejected")
  } catch (err) { next(err) }
}
