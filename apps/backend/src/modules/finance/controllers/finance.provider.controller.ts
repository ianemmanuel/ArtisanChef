import type { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import {
  listPaymentProviders,
  getPaymentProvider,
  createPaymentProvider,
  updatePaymentProvider,
  setPaymentProviderStatus,
} from "../services/finance.provider.service"
import {
  listPaymentProvidersQuerySchema,
  createPaymentProviderSchema,
  updatePaymentProviderSchema,
  setFinanceReferenceStatusSchema,
} from "../schemas/finance.provider.schema"

/*
 * Request bodies/queries are parsed here with `schema.parse()` — a thrown
 * ZodError is converted to a 422-style ApiError by the global error
 * middleware. Same convention as the vendor module's controllers.
 */

export const handleListPaymentProviders: RequestHandler = async (req, res, next) => {
  try {
    const query = listPaymentProvidersQuerySchema.parse(req.query)
    const data = await listPaymentProviders(query)
    return sendSuccess(res, data, "Payment providers fetched")
  } catch (err) { next(err) }
}

export const handleGetPaymentProvider: RequestHandler = async (req, res, next) => {
  try {
    const { idOrCode } = req.params as { idOrCode: string }
    const data = await getPaymentProvider(idOrCode)
    return sendSuccess(res, data, "Payment provider fetched")
  } catch (err) { next(err) }
}

export const handleCreatePaymentProvider: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const input = createPaymentProviderSchema.parse(req.body)
    const data = await createPaymentProvider(input, adminUser.id, adminScope)
    return sendSuccess(res, data, "Payment provider created", 201)
  } catch (err) { next(err) }
}

export const handleUpdatePaymentProvider: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { idOrCode } = req.params as { idOrCode: string }
    const input = updatePaymentProviderSchema.parse(req.body)
    const data = await updatePaymentProvider(idOrCode, input, adminUser.id, adminScope)
    return sendSuccess(res, data, "Payment provider updated")
  } catch (err) { next(err) }
}

export const handleSetPaymentProviderStatus: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { idOrCode } = req.params as { idOrCode: string }
    const { status } = setFinanceReferenceStatusSchema.parse(req.body)
    const data = await setPaymentProviderStatus(idOrCode, status, adminUser.id, adminScope)
    return sendSuccess(res, data, status === "ACTIVE" ? "Payment provider activated" : "Payment provider deactivated")
  } catch (err) { next(err) }
}
