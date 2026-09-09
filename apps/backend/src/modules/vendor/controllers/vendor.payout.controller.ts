import { Request, Response, NextFunction } from "express"
import { getVendorAccount } from "@/helpers/auth/vendorAuth"
import { ApiError } from "@/middleware/error"
import { sendSuccess } from "@/helpers/api-response/response"
import {
  addPayoutAccount,
  removePayoutAccount,
  setDefaultPayoutAccount,
  listPayoutAccounts,
  getPayoutAccount,
  getAvailablePayoutMethods,
  listSupportedBanks,
  getVendorPayoutVerificationRequirement,
  presignVendorPayoutProof,
} from "../services/vendor.payout.service"
import type { AddPayoutAccountRequest, idParam } from "@repo/types/backend"


//* GET available payout methods for the vendor's country
export const handleGetAvailablePayoutMethods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)

    const methods = await getAvailablePayoutMethods(auth.vendorAccount.id)
    return sendSuccess(res, methods, "Available payout methods fetched")
  } catch (err) { next(err) }
}


//* GET how this vendor's country verifies bank payout accounts, and (in
//* MANUAL mode) which proof document to upload. Drives which variant of the
//* payout form the vendor app renders.
export const handleGetPayoutVerificationRequirement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)

    const requirement = await getVendorPayoutVerificationRequirement(auth.vendorAccount.id)
    return sendSuccess(res, requirement, "Payout verification requirement fetched")
  } catch (err) { next(err) }
}


//* POST presign an upload for a payout proof document (MANUAL mode only)
export const handlePresignPayoutProof = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)
    // The vendor app's shared PresignUploadRequest sends `fileType`; some
    // callers send `mimeType`. Accept either, same as every other presign
    // controller in this module.
    const { countryPaymentMethodId, documentTypeId, fileName, mimeType, fileType } = req.body ?? {}
    const resolvedType = mimeType || fileType

    if (typeof countryPaymentMethodId !== "string" || typeof documentTypeId !== "string" || typeof fileName !== "string" || typeof resolvedType !== "string") {
      throw new ApiError(400, "countryPaymentMethodId, documentTypeId, fileName and fileType are required", "MISSING_FIELDS")
    }

    const result = await presignVendorPayoutProof(auth.vendorAccount.id, {
      countryPaymentMethodId, documentTypeId, fileName, mimeType: resolvedType,
    })
    return sendSuccess(res, result, "Upload URL generated")
  } catch (err) { next(err) }
}


//* GET the supported bank list for the vendor's own country/provider (Vendor 1E)
export const handleListSupportedBanks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)
    // The bank directory is PAYMENT_METHOD-routed (it comes from the payout
    // provider), so the method the vendor is adding an account for is
    // required routing context — never guessed.
    const methodId = req.query.methodId
    if (typeof methodId !== "string" || !methodId.trim()) {
      throw new ApiError(400, "methodId is required", "MISSING_FIELDS")
    }

    const result = await listSupportedBanks(auth.vendorAccount.id, methodId)
    return sendSuccess(res, result, "Supported banks fetched")
  } catch (err) { next(err) }
}


//* GET all payout accounts for the vendor
export const handleListPayoutAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)

    const accounts = await listPayoutAccounts(auth.vendorAccount.id)
    return sendSuccess(res, accounts, "Payout accounts fetched")
  } catch (err) { next(err) }
}


//* GET a single payout account
export const handleGetPayoutAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)

    const { id } = req.params as idParam
    const account = await getPayoutAccount(auth.vendorAccount.id, id)
    return sendSuccess(res, account, "Payout account fetched")
  } catch (err) { next(err) }
}


//* ADD a payout account
export const handleAddPayoutAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)

    const {
      countryPaymentMethodId, accountHolderName,
      mobileNetwork, mobileNumber,
      bankName, branchName, bankCode, branchCode, accountNumber, swiftCode, iban, routingNumber,
      paypalEmail, stripeAccountId, proofDocument,
    } = req.body

    if (!countryPaymentMethodId || !accountHolderName) {
      throw new ApiError(400, "countryPaymentMethodId and accountHolderName are required", "MISSING_FIELDS")
    }

    const input: AddPayoutAccountRequest = {
      countryPaymentMethodId, accountHolderName,
      mobileNetwork, mobileNumber,
      bankName, branchName, bankCode, branchCode, accountNumber, swiftCode, iban, routingNumber,
      paypalEmail, stripeAccountId,
      // MANUAL-verification countries send proof of bank-account
      // ownership alongside the account. The service validates it against
      // the country's requirement and rejects it outright in a PROVIDER
      // country — the two paths never mix.
      proofDocument,
    }

    const account = await addPayoutAccount(auth.vendorAccount.id, input)
    return sendSuccess(res, account, "Payout account added successfully", 201)
  } catch (err) { next(err) }
}


//* SET default payout account
export const handleSetDefaultPayoutAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)

    const { id } = req.params as idParam
    const result = await setDefaultPayoutAccount(auth.vendorAccount.id, id)
    return sendSuccess(res, result, "Default payout account updated")
  } catch (err) { next(err) }
}


//* REMOVE a payout account
export const handleRemovePayoutAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)

    const { id } = req.params as idParam
    const result = await removePayoutAccount(auth.vendorAccount.id, id)
    return sendSuccess(res, result, "Payout account removed")
  } catch (err) { next(err) }
}