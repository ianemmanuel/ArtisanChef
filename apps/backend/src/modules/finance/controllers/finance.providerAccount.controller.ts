import type { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { resolveCountryIdInScope } from "../lib/resolve-country"
import {
  listProviderAccounts,
  getProviderAccount,
  createProviderAccount,
  updateProviderAccount,
  activateProviderAccount,
  suspendProviderAccount,
  disableProviderAccount,
  restoreProviderAccount,
} from "../services/finance.providerAccount.service"
import {
  createCountryProviderAccountSchema,
  updateCountryProviderAccountSchema,
  suspendSchema,
} from "../schemas/finance.providerAccount.schema"
import { testProviderAccountBankList } from "../services/finance.providerTest.service"

function ctx(req: unknown) {
  const { adminUser, adminScope } = req as AdminRequest
  return { actorId: adminUser.id, scope: adminScope }
}

export const handleListProviderAccounts: RequestHandler = async (req, res, next) => {
  try {
    const { scope } = ctx(req)
    const countryId = await resolveCountryIdInScope(req.params.countryRef as string, scope)
    const data = await listProviderAccounts(countryId, scope)
    return sendSuccess(res, data, "Provider accounts fetched")
  } catch (err) { next(err) }
}

export const handleCreateProviderAccount: RequestHandler = async (req, res, next) => {
  try {
    const { actorId, scope } = ctx(req)
    const countryId = await resolveCountryIdInScope(req.params.countryRef as string, scope)
    const input = createCountryProviderAccountSchema.parse(req.body)
    const data = await createProviderAccount(countryId, input, actorId, scope)
    return sendSuccess(res, data, "Provider account created", 201)
  } catch (err) { next(err) }
}

export const handleGetProviderAccount: RequestHandler = async (req, res, next) => {
  try {
    const { scope } = ctx(req)
    const data = await getProviderAccount(req.params.accountId as string, scope)
    return sendSuccess(res, data, "Provider account fetched")
  } catch (err) { next(err) }
}

export const handleUpdateProviderAccount: RequestHandler = async (req, res, next) => {
  try {
    const { actorId, scope } = ctx(req)
    const input = updateCountryProviderAccountSchema.parse(req.body)
    const data = await updateProviderAccount(req.params.accountId as string, input, actorId, scope)
    return sendSuccess(res, data, "Provider account updated")
  } catch (err) { next(err) }
}

export const handleActivateProviderAccount: RequestHandler = async (req, res, next) => {
  try {
    const { actorId, scope } = ctx(req)
    const data = await activateProviderAccount(req.params.accountId as string, actorId, scope)
    return sendSuccess(res, data, "Provider account activated")
  } catch (err) { next(err) }
}

export const handleSuspendProviderAccount: RequestHandler = async (req, res, next) => {
  try {
    const { actorId, scope } = ctx(req)
    const { reason } = suspendSchema.parse(req.body)
    const data = await suspendProviderAccount(req.params.accountId as string, reason, actorId, scope)
    return sendSuccess(res, data, "Provider account suspended")
  } catch (err) { next(err) }
}

export const handleDisableProviderAccount: RequestHandler = async (req, res, next) => {
  try {
    const { actorId, scope } = ctx(req)
    const data = await disableProviderAccount(req.params.accountId as string, actorId, scope)
    return sendSuccess(res, data, "Provider account disabled")
  } catch (err) { next(err) }
}

export const handleRestoreProviderAccount: RequestHandler = async (req, res, next) => {
  try {
    const { actorId, scope } = ctx(req)
    const data = await restoreProviderAccount(req.params.accountId as string, actorId, scope)
    return sendSuccess(res, data, "Provider account restored")
  } catch (err) { next(err) }
}

export const handleTestProviderAccountBankList: RequestHandler = async (req, res, next) => {
  try {
    const { scope } = ctx(req)
    const data = await testProviderAccountBankList(req.params.accountId as string, scope, {
      traceId: (req as { id?: string }).id,
    })
    return sendSuccess(res, data, "Provider connectivity test succeeded")
  } catch (err) { next(err) }
}
