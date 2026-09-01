import type { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import {
  listCurrencies,
  getCurrency,
  createCurrency,
  updateCurrency,
  setCurrencyStatus,
} from "../services/finance.currency.service"
import {
  listCurrenciesQuerySchema,
  createCurrencySchema,
  updateCurrencySchema,
} from "../schemas/finance.currency.schema"
import { setFinanceReferenceStatusSchema } from "../schemas/finance.provider.schema"

export const handleListCurrencies: RequestHandler = async (req, res, next) => {
  try {
    const query = listCurrenciesQuerySchema.parse(req.query)
    const data = await listCurrencies(query)
    return sendSuccess(res, data, "Currencies fetched")
  } catch (err) { next(err) }
}

export const handleGetCurrency: RequestHandler = async (req, res, next) => {
  try {
    const { code } = req.params as { code: string }
    const data = await getCurrency(code)
    return sendSuccess(res, data, "Currency fetched")
  } catch (err) { next(err) }
}

export const handleCreateCurrency: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const input = createCurrencySchema.parse(req.body)
    const data = await createCurrency(input, adminUser.id, adminScope)
    return sendSuccess(res, data, "Currency created", 201)
  } catch (err) { next(err) }
}

export const handleUpdateCurrency: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { code } = req.params as { code: string }
    const input = updateCurrencySchema.parse(req.body)
    const data = await updateCurrency(code, input, adminUser.id, adminScope)
    return sendSuccess(res, data, "Currency updated")
  } catch (err) { next(err) }
}

export const handleSetCurrencyStatus: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { code } = req.params as { code: string }
    const { status } = setFinanceReferenceStatusSchema.parse(req.body)
    const data = await setCurrencyStatus(code, status, adminUser.id, adminScope)
    return sendSuccess(res, data, status === "ACTIVE" ? "Currency activated" : "Currency deactivated")
  } catch (err) { next(err) }
}
