import { Request, Response, NextFunction } from "express"
import { getVendorAccount } from "@/helpers/auth/vendorAuth"
import { ApiError } from "@/middleware/error"
import { sendSuccess } from "@/helpers/api-response/response"
import {
  getVendorProfile,
  upsertVendorProfile,
  getVendorGoLiveStatus,
  publishVendorProfile,
  unpublishVendorProfile,
} from "../services/vendor.profile.service"
import type { UpsertVendorProfileRequest } from "@repo/types/backend"

export const handleGetVendorProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)
    const profile = await getVendorProfile(auth.vendorAccount.id)
    return sendSuccess(res, profile, "Profile fetched")
  } catch (err) { next(err) }
}

export const handleUpsertVendorProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)
    const {
      displayName, tagline, description, story, logoUrl, coverImageUrl,
      publicEmail, publicPhone, website, socialLinks, reservationLink,
      primaryCuisineId, specialties, dietaryOptions, foundedYear,
    } = req.body

    if (!displayName) throw new ApiError(400, "displayName is required", "MISSING_FIELDS")

    const input: UpsertVendorProfileRequest = {
      displayName, tagline, description, story, logoUrl, coverImageUrl,
      publicEmail, publicPhone, website, socialLinks, reservationLink,
      primaryCuisineId, specialties, dietaryOptions, foundedYear,
    }

    const profile = await upsertVendorProfile(auth.vendorAccount.id, input)
    return sendSuccess(res, profile, "Profile saved")
  } catch (err) { next(err) }
}

export const handleGetGoLiveStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)
    const status = await getVendorGoLiveStatus(auth.vendorAccount.id)
    return sendSuccess(res, status, "Go-live status fetched")
  } catch (err) { next(err) }
}

export const handlePublishVendorProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)
    const profile = await publishVendorProfile(auth.vendorAccount.id)
    return sendSuccess(res, profile, "You're live!")
  } catch (err) { next(err) }
}

export const handleUnpublishVendorProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = await getVendorAccount(req)
    const profile = await unpublishVendorProfile(auth.vendorAccount.id)
    return sendSuccess(res, profile, "Profile unpublished")
  } catch (err) { next(err) }
}
