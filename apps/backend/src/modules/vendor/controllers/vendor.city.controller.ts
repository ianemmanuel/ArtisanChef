import { Request, Response, NextFunction } from "express"
import { getVendorAccount } from "@/helpers/auth/vendorAuth"
import { sendSuccess } from "@/helpers/api-response/response"
import { listActiveCitiesForVendor } from "../services/vendor.city.service"

//* GET /vendor/v1/cities — active cities in the vendor's registered country
export const handleListCities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)
    const cities = await listActiveCitiesForVendor(auth.vendorAccount.id)
    return sendSuccess(res, cities, "Cities fetched")
  } catch (err) { next(err) }
}
