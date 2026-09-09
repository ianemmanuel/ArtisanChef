import type { RequestHandler } from "express"
import type { BankVerificationMode } from "@repo/db"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { resolveCountryIdInScope } from "../lib/resolve-country"
import {
  getOrCreateConfig,
  getCountryFinancialConfigView,
  setBankVerificationProviderAccount,
  setBankVerificationMode,
  setOperationalSwitches,
  activateConfig,
  suspendConfig,
  disableConfig,
  restoreConfig,
} from "../services/finance.countryConfig.service"
import {
  setBankVerificationProviderAccountSchema,
  setBankVerificationModeSchema,
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

export const handleSetBankVerificationProviderAccount: RequestHandler = async (req, res, next) => {
  try {
    const { actorId, scope } = ctx(req)
    const countryId = await resolveCountryIdInScope(req.params.countryRef as string, scope)
    const { providerAccountId } = setBankVerificationProviderAccountSchema.parse(req.body)
    const data = await setBankVerificationProviderAccount(countryId, providerAccountId, actorId, scope)
    return sendSuccess(res, data, "Bank-verification provider account updated")
  } catch (err) { next(err) }
}

export const handleSetBankVerificationMode: RequestHandler = async (req, res, next) => {
  try {
    const { actorId, scope } = ctx(req)
    const countryId = await resolveCountryIdInScope(req.params.countryRef as string, scope)
    const { mode } = setBankVerificationModeSchema.parse(req.body)
    const data = await setBankVerificationMode(countryId, mode as BankVerificationMode, actorId, scope)
    return sendSuccess(res, data, "Bank-verification mode updated")
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

export const handleRestoreConfig: RequestHandler = async (req, res, next) => {
  try {
    const { actorId, scope } = ctx(req)
    const countryId = await resolveCountryIdInScope(req.params.countryRef as string, scope)
    const data = await restoreConfig(countryId, actorId, scope)
    return sendSuccess(res, data, "Financial configuration restored")
  } catch (err) { next(err) }
}
