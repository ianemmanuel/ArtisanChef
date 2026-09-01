import type { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { resolveCountryIdInScope } from "../lib/resolve-country"
import {
  getOrCreateConfig,
  getCountryFinancialConfigView,
  setConfigCurrency,
  setActiveProviderAccount,
  setOperationalSwitches,
  activateConfig,
  suspendConfig,
  disableConfig,
} from "../services/finance.countryConfig.service"
import {
  setConfigCurrencySchema,
  setActiveProviderAccountSchema,
  setOperationalSwitchesSchema,
} from "../schemas/finance.countryConfig.schema"
import { suspendSchema } from "../schemas/finance.providerAccount.schema"

function ctx(req: unknown) {
  const { adminUser, adminScope } = req as AdminRequest
  return { actorId: adminUser.id, scope: adminScope }
}

export const handleGetCountryFinancialConfig: RequestHandler = async (req, res, next) => {
  try {
    const { scope } = ctx(req)
    const countryId = await resolveCountryIdInScope(req.params.countryRef as string, scope)
    const data = await getCountryFinancialConfigView(countryId, scope)
    return sendSuccess(res, data, "Country financial configuration fetched")
  } catch (err) { next(err) }
}

export const handleCreateCountryFinancialConfig: RequestHandler = async (req, res, next) => {
  try {
    const { actorId, scope } = ctx(req)
    const countryId = await resolveCountryIdInScope(req.params.countryRef as string, scope)
    const data = await getOrCreateConfig(countryId, actorId, scope)
    return sendSuccess(res, data, "Country financial configuration ready", 201)
  } catch (err) { next(err) }
}

export const handleSetConfigCurrency: RequestHandler = async (req, res, next) => {
  try {
    const { actorId, scope } = ctx(req)
    const countryId = await resolveCountryIdInScope(req.params.countryRef as string, scope)
    const { currencyCode } = setConfigCurrencySchema.parse(req.body)
    const data = await setConfigCurrency(countryId, currencyCode, actorId, scope)
    return sendSuccess(res, data, "Currency updated")
  } catch (err) { next(err) }
}

export const handleSetActiveProviderAccount: RequestHandler = async (req, res, next) => {
  try {
    const { actorId, scope } = ctx(req)
    const countryId = await resolveCountryIdInScope(req.params.countryRef as string, scope)
    const { activeProviderAccountId } = setActiveProviderAccountSchema.parse(req.body)
    const data = await setActiveProviderAccount(countryId, activeProviderAccountId, actorId, scope)
    return sendSuccess(res, data, "Active provider account updated")
  } catch (err) { next(err) }
}

export const handleSetOperationalSwitches: RequestHandler = async (req, res, next) => {
  try {
    const { actorId, scope } = ctx(req)
    const countryId = await resolveCountryIdInScope(req.params.countryRef as string, scope)
    const input = setOperationalSwitchesSchema.parse(req.body)
    const data = await setOperationalSwitches(countryId, input, actorId, scope)
    return sendSuccess(res, data, "Operational switches updated")
  } catch (err) { next(err) }
}

export const handleActivateConfig: RequestHandler = async (req, res, next) => {
  try {
    const { actorId, scope } = ctx(req)
    const countryId = await resolveCountryIdInScope(req.params.countryRef as string, scope)
    const data = await activateConfig(countryId, actorId, scope)
    return sendSuccess(res, data, "Financial configuration activated")
  } catch (err) { next(err) }
}

export const handleSuspendConfig: RequestHandler = async (req, res, next) => {
  try {
    const { actorId, scope } = ctx(req)
    const countryId = await resolveCountryIdInScope(req.params.countryRef as string, scope)
    const { reason } = suspendSchema.parse(req.body)
    const data = await suspendConfig(countryId, reason, actorId, scope)
    return sendSuccess(res, data, "Financial configuration suspended")
  } catch (err) { next(err) }
}

export const handleDisableConfig: RequestHandler = async (req, res, next) => {
  try {
    const { actorId, scope } = ctx(req)
    const countryId = await resolveCountryIdInScope(req.params.countryRef as string, scope)
    const data = await disableConfig(countryId, actorId, scope)
    return sendSuccess(res, data, "Financial configuration disabled")
  } catch (err) { next(err) }
}
