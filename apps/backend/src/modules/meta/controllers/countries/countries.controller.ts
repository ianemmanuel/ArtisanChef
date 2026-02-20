import { Request, Response, NextFunction } from "express"
import { prisma, GeoStatus, VendorTypeStatus } from "@repo/db"
import { sendSuccess } from "@/helpers/api-response/response"
import { getVendorUser } from "@/helpers/auth/vendorAuth"
import { ApiError } from "@/middleware/error"

/**
 * GET /api/v1/meta/onboarding/countries
 *
 * Returns only countries:
 * - ACTIVE
 * - That have at least one ACTIVE vendor type
 */
export const getOnboardingCountries = async (
  req: Request,
  res: Response, 
  next: NextFunction
) => {
  try {

    const auth = await getVendorUser(req)
    if (!auth.ok) return next(new ApiError(auth.status, auth.message))

    const countries = await prisma.country.findMany({
      where: {
        status: GeoStatus.ACTIVE,
        vendorTypes: {
          some: {
            status: GeoStatus.ACTIVE,
            vendorType: {
              status: VendorTypeStatus.ACTIVE,
              deletedAt: null,
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        code: true,
        currency: true,
        phoneCode: true,
        currencySymbol: true,
      },
      orderBy: { name: "asc" },
    })

    return sendSuccess(res, { countries })
  } catch (err) {
    next(err)
  }
}

