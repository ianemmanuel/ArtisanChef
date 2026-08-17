import { Router } from "express"
import { AdminPermissions } from "@repo/types/enums"
import { requirePermission } from "@/modules/admin/middleware"
import {
  handleSetOwnAvailability,
  handleSetReviewerAvailability,
  handleListUnavailableReviewers,
} from "../../controllers/admin.reviewerAvailability.controller"

/*
 * Deliberately NOT mounted under /admin/v1/users — that router applies
 * requireIdentityAccess, which hard-blocks vendor_ops "regardless of
 * individual permission grants." A privileged vendor_ops admin must be
 * able to reach handleSetReviewerAvailability via an individually
 * granted vendors:reviewers:manage_availability permission, which
 * requireIdentityAccess would make impossible.
 */
const reviewerRouter: Router = Router()

reviewerRouter.patch("/me/availability", handleSetOwnAvailability)

reviewerRouter.get(
  "/unavailable",
  requirePermission(AdminPermissions.VENDORS_REVIEWERS_MANAGE_AVAILABILITY),
  handleListUnavailableReviewers,
)
reviewerRouter.patch(
  "/:adminUserId/availability",
  requirePermission(AdminPermissions.VENDORS_REVIEWERS_MANAGE_AVAILABILITY),
  handleSetReviewerAvailability,
)

export default reviewerRouter
