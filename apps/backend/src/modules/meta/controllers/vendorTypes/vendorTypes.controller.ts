import { Request, Response, NextFunction } from "express"
import { prisma, GeoStatus, VendorTypeStatus } from "@repo/db"
import { sendSuccess } from "@/helpers/api-response/response"
import { getVendorUser } from "@/helpers/auth/vendorAuth"
import { ApiError } from "@/middleware/error"


/**
 * GET /api/v1/meta/onboarding/vendor-types?countryId=xxx
 *
 * Returns vendor types:
 * - ACTIVE
 * - Enabled for the selected country
 */
export const getOnboardingVendorTypes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {

    const auth = await getVendorUser(req)
    if (!auth.ok) return next(new ApiError(auth.status, auth.message))

    const { countryId } = req.query

    if (!countryId || typeof countryId !== "string") {
      return sendSuccess(res, { vendorTypes: [] })
    }

    const vendorTypes = await prisma.vendorTypeCountry.findMany({
      where: {
        countryId,
        status: GeoStatus.ACTIVE,
        vendorType: {
          status: VendorTypeStatus.ACTIVE,
          deletedAt: null,
        },
      },
      select: {
        vendorType: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        vendorType: {
          name: "asc",
        },
      },
    })

    return sendSuccess(res, {
      vendorTypes: vendorTypes.map((v) => v.vendorType),
    })
  } catch (err) {
    next(err)
  }
}
