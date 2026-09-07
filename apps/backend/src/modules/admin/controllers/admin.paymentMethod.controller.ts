import type { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import type { PaymentMethodType, PaymentDirection } from "@repo/db"
import { sendSuccess } from "@/helpers/api-response/response"
import { ApiError } from "@/errors/ApiError"
import {
  listPaymentMethods,
  getPaymentMethod,
  createPaymentMethod,
  updatePaymentMethod,
  setPaymentMethodActive,
  listCountryPaymentMethods,
  configureCountryPaymentMethod,
  updateCountryPaymentMethod,
  setCountryPaymentMethodStatus,
} from "../services/admin.paymentMethod.service"

export const handleListPaymentMethods: RequestHandler = async (req, res, next) => {
  try {
    const { search, isActive, page, pageSize } = req.query
    const data = await listPaymentMethods({
      search  : search as string | undefined,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
      page    : page     ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    })
    return sendSuccess(res, data, "Payment methods fetched")
  } catch (err) { next(err) }
}

export const handleGetPaymentMethod: RequestHandler = async (req, res, next) => {
  try {
    const { idOrCode } = req.params as { idOrCode: string }
    const method = await getPaymentMethod(idOrCode)
    return sendSuccess(res, method, "Payment method fetched")
  } catch (err) { next(err) }
}

export const handleCreatePaymentMethod: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { code, name, type, direction, logoUrl, description } = req.body as {
      code?: string; name?: string; type?: PaymentMethodType; direction?: PaymentDirection[]; logoUrl?: string; description?: string
    }
    if (!code?.trim() || !name?.trim() || !type || !direction) {
      throw new ApiError(400, "code, name, type, and direction are required", "MISSING_FIELDS")
    }
    const method = await createPaymentMethod({ code, name, type, direction, logoUrl, description }, adminUser.id, adminScope)
    return sendSuccess(res, method, "Payment method created", 201)
  } catch (err) { next(err) }
}

export const handleUpdatePaymentMethod: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { idOrCode } = req.params as { idOrCode: string }
    const { name, type, direction, logoUrl, description } = req.body as {
      name?: string; type?: PaymentMethodType; direction?: PaymentDirection[]; logoUrl?: string; description?: string
    }
    const method = await updatePaymentMethod(idOrCode, { name, type, direction, logoUrl, description }, adminUser.id, adminScope)
    return sendSuccess(res, method, "Payment method updated")
  } catch (err) { next(err) }
}

export const handleSetPaymentMethodActive: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { idOrCode } = req.params as { idOrCode: string }
    const { isActive } = req.body as { isActive?: boolean }
    if (typeof isActive !== "boolean") throw new ApiError(400, "isActive (boolean) is required", "MISSING_FIELDS")

    const method = await setPaymentMethodActive(idOrCode, isActive, adminUser.id, adminScope)
    return sendSuccess(res, method, isActive ? "Payment method reactivated" : "Payment method deactivated")
  } catch (err) { next(err) }
}

export const handleListCountryPaymentMethods: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const { countryIdOrSlug } = req.params as { countryIdOrSlug: string }
    const { direction } = req.query as { direction?: PaymentDirection }

    const configs = await listCountryPaymentMethods(countryIdOrSlug, adminScope, direction)
    return sendSuccess(res, configs, "Country payment methods fetched")
  } catch (err) { next(err) }
}

export const handleConfigureCountryPaymentMethod: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { countryId, paymentMethodId, direction, displayOrder } = req.body as {
      countryId?: string; paymentMethodId?: string; direction?: PaymentDirection; displayOrder?: number
    }
    if (!countryId?.trim() || !paymentMethodId?.trim() || !direction) {
      throw new ApiError(400, "countryId, paymentMethodId, and direction are required", "MISSING_FIELDS")
    }

    const config = await configureCountryPaymentMethod(
      { countryId, paymentMethodId, direction, displayOrder },
      adminUser.id, adminScope,
    )
    return sendSuccess(res, config, "Country payment method configured", 201)
  } catch (err) { next(err) }
}

export const handleUpdateCountryPaymentMethod: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }
    const { displayOrder } = req.body as { displayOrder?: number }
    const config = await updateCountryPaymentMethod(id, { displayOrder }, adminUser.id, adminScope)
    return sendSuccess(res, config, "Country payment method updated")
  } catch (err) { next(err) }
}

export const handleSetCountryPaymentMethodStatus: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { id } = req.params as { id: string }
    const { status } = req.body as { status?: "ACTIVE" | "INACTIVE" | "DEPRECATED" }
    if (!status) throw new ApiError(400, "status is required", "MISSING_FIELDS")

    const config = await setCountryPaymentMethodStatus(id, status, adminUser.id, adminScope)
    return sendSuccess(res, config, "Country payment method status updated")
  } catch (err) { next(err) }
}
