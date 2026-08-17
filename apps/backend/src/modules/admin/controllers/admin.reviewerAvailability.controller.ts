import type { RequestHandler } from "express"
import { AdminReviewAvailability } from "@repo/db"
import type { AdminRequest } from "@repo/types/backend"
import { sendSuccess } from "@/helpers/api-response/response"
import { ApiError } from "@/errors/ApiError"
import {
  setOwnAvailability,
  setReviewerAvailability,
  listUnavailableReviewersWithCaseload,
} from "../services/admin.reviewerAvailability.service"

function parseAvailabilityInput(body: unknown) {
  const { availability, unavailableFrom, unavailableUntil, unavailableReason } = body as {
    availability?: string
    unavailableFrom?: string
    unavailableUntil?: string
    unavailableReason?: string
  }

  if (availability !== AdminReviewAvailability.AVAILABLE && availability !== AdminReviewAvailability.UNAVAILABLE) {
    throw new ApiError(400, "availability must be 'AVAILABLE' or 'UNAVAILABLE'", "INVALID_AVAILABILITY")
  }

  return {
    availability,
    unavailableFrom  : unavailableFrom ? new Date(unavailableFrom) : undefined,
    unavailableUntil : unavailableUntil ? new Date(unavailableUntil) : undefined,
    unavailableReason,
  }
}

//* PATCH /admin/v1/vendor-reviewers/me/availability — no permission beyond auth chain, self-scoped.
export const handleSetOwnAvailability: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser } = req as unknown as AdminRequest
    const input = parseAvailabilityInput(req.body)
    const result = await setOwnAvailability(adminUser.id, input)
    return sendSuccess(res, result, "Availability updated")
  } catch (err) { next(err) }
}

//* PATCH /admin/v1/vendor-reviewers/:adminUserId/availability — requires vendors:reviewers:manage_availability.
export const handleSetReviewerAvailability: RequestHandler = async (req, res, next) => {
  try {
    const { adminUser, adminScope } = req as unknown as AdminRequest
    const { adminUserId } = req.params as { adminUserId: string }
    const input = parseAvailabilityInput(req.body)
    const result = await setReviewerAvailability(adminUserId, input, adminUser.id, adminScope)
    return sendSuccess(res, result, "Reviewer availability updated")
  } catch (err) { next(err) }
}

//* GET /admin/v1/vendor-reviewers/unavailable
export const handleListUnavailableReviewers: RequestHandler = async (req, res, next) => {
  try {
    const { adminScope } = req as unknown as AdminRequest
    const result = await listUnavailableReviewersWithCaseload(adminScope)
    return sendSuccess(res, result, "Unavailable reviewers fetched")
  } catch (err) { next(err) }
}
