import { Request } from "express"
import { prisma } from "@repo/db"

export async function getVendorUser(req: Request) {
  //* requireApp middleware guarantees auth + vendor app context,

  if (!req.auth) {
    return { ok: false as const, status: 401, message: "Unauthorized" }
  }

  const vendorUser = await prisma.vendorUser.findUnique({
    where: { clerkId: req.auth.clerkUserId },
  })

  if (!vendorUser) {
    return { ok: false as const, status: 404, message: "Vendor user not found" }
  }

  return {
    ok: true as const,
    vendorUser,
  }
}

export async function getVendorApplication(req: Request) {
  const base = await getVendorUser(req)
  if (!base.ok) return base

  const application = await prisma.vendorApplication.findFirst({
    where: {
      userId: base.vendorUser.id,
    },
  })

  if (!application) {
    return {
      ok: false as const,
      status: 404,
      message: "Vendor application not found",
    }
  }

  return {
    ok: true as const,
    vendorUser: base.vendorUser,
    application,
  }
}

export async function getVendorAccount(req: Request) {
  const base = await getVendorUser(req)
  if (!base.ok) return base

  const vendorAccount = await prisma.vendorAccount.findFirst({
    where: {
      userId: base.vendorUser.id,
      deletedAt: null,
    },
  })

  if (!vendorAccount) {
    return {
      ok: false as const,
      status: 404,
      message: "Vendor account not found",
    }
  }

  return {
    ok: true as const,
    vendorUser: base.vendorUser,
    vendorAccount,
  }
}