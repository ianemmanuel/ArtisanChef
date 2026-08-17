import { Request } from "express"
import { prisma, type VendorUser } from "@repo/db"
import type { VendorRequest } from "@repo/types/backend"

import { ApiError } from "@/errors/ApiError"
import { HttpStatus } from "@/constants/httpStatus"

/*
 * Business-data fetch, not identity resolution — identity/state (incl.
 * isDeleted/isActive/isBanned) is already established upstream by
 * vendorAuthChain (verifyVendorToken + loadVendorContext), which
 * populates req.vendor before any controller runs. This just resolves
 * the full VendorUser row for req.vendor.user.id, since req.vendor.user
 * is deliberately a narrow request-context shape (no clerkId, etc.) and
 * callers (e.g. vendor.application.service.ts, for Clerk metadata
 * mirroring) need the full row.
 */
export async function getVendorUser(req: Request): Promise<VendorUser> {
  const { vendor } = req as VendorRequest

  if (!vendor) {
    throw new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized", "MISSING_VENDOR_CONTEXT")
  }

  const vendorUser = await prisma.vendorUser.findUnique({
    where: { id: vendor.user.id },
  })

  if (!vendorUser) {
    throw new ApiError(HttpStatus.NOT_FOUND, "Vendor user not found", "VENDOR_USER_NOT_FOUND")
  }

  return vendorUser
}

/*
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