import type { RequestHandler } from "express"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { resolveCountryIdInScope } from "../lib/resolve-country"
import {
  listCountryPaymentMethods,
  setPaymentMethodProviderAccount,
} from "../services/finance.paymentMethodProvider.service"
import { setPaymentMethodProviderAccountSchema } from "../schemas/finance.paymentMethodProvider.schema"

function ctx(req: unknown) {
  const { adminUser, adminScope } = req as AdminRequest
  return { actorId: adminUser.id, scope: adminScope }
}

export const handleListCountryPaymentMethods: RequestHandler = async (req, res, next) => {
  try {
    const { scope } = ctx(req)
    const countryId = await resolveCountryIdInScope(req.params.countryRef as string, scope)
    const data = await listCountryPaymentMethods(countryId, scope)
    return sendSuccess(res, data, "Country payment methods fetched")
  } catch (err) { next(err) }
}

export const handleSetPaymentMethodProviderAccount: RequestHandler = async (req, res, next) => {
  try {
    const { actorId, scope } = ctx(req)
    // countryRef is resolved (and scoped) so an out-of-scope country 404s
    // before we touch the method; the method id is then checked against it.
    await resolveCountryIdInScope(req.params.countryRef as string, scope)
    const { countryProviderAccountId } = setPaymentMethodProviderAccountSchema.parse(req.body)
    const data = await setPaymentMethodProviderAccount(
      req.params.methodId as string,
      countryProviderAccountId,
      actorId,
      scope,
    )
    return sendSuccess(res, data, countryProviderAccountId ? "Payment method wired to provider account" : "Payment method unwired")
  } catch (err) { next(err) }
}
