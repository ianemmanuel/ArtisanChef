import { Request } from "express"
import { prisma, type VendorUser } from "@repo/db"

import { ApiError } from "@/errors/apiError"
import { HttpStatus } from "@/constants/httpStatus"

export async function getVendorUser(req: Request): Promise<VendorUser> {
  //* requireApp middleware guarantees auth + vendor app context

  if (!req.auth) {
    throw new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized", "MISSING_AUTH_CONTEXT")
  }

  const vendorUser = await prisma.vendorUser.findUnique({
    where: { clerkId: req.auth.clerkUserId },
  })

  if (!vendorUser) {
    throw new ApiError(HttpStatus.NOT_FOUND, "Vendor user not found", "VENDOR_USER_NOT_FOUND")
  }

  return vendorUser
}

/**
 * @param vendorUser — pass this if the caller already resolved it
 * (e.g. via getVendorUser earlier in the same request) to skip a
 * redundant lookup.
 */
export async function getVendorApplication(req: Request, vendorUser?: VendorUser) {
  const resolvedVendorUser = vendorUser ?? await getVendorUser(req)

  const application = await prisma.vendorApplication.findFirst({
    where: { userId: resolvedVendorUser.id },
  })

  if (!application) {
    throw new ApiError(HttpStatus.NOT_FOUND, "Vendor application not found", "VENDOR_APPLICATION_NOT_FOUND")
  }

  return { vendorUser: resolvedVendorUser, application }
}

/**
 * @param vendorUser — pass this if the caller already resolved it
 * (e.g. via getVendorUser earlier in the same request) to skip a
 * redundant lookup.
 */
export async function getVendorAccount(req: Request, vendorUser?: VendorUser) {
  const resolvedVendorUser = vendorUser ?? await getVendorUser(req)

  const vendorAccount = await prisma.vendorAccount.findFirst({
    where: {
      userId: resolvedVendorUser.id,
      deletedAt: null,
    },
  })

  if (!vendorAccount) {
    throw new ApiError(HttpStatus.NOT_FOUND, "Vendor account not found", "VENDOR_ACCOUNT_NOT_FOUND")
  }

  return { vendorUser: resolvedVendorUser, vendorAccount }
}