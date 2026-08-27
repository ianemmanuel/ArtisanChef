import { prisma, Prisma, ProfileReviewStatus, PayoutVerificationStatus, OutletAdminStatus } from "@repo/db"
import { ApiError } from "@/middleware/error"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"
import { SYSTEM_USER_ID } from "@/constants/system"
import { Filter } from "bad-words"
import type { UpsertVendorProfileRequest, VendorGoLiveStatus } from "@repo/types/backend"

const serviceLog = logger.child({ module: "vendor-profile-service" })
const profanityFilter = new Filter()

async function loadActiveVendor(vendorId: string) {
  const vendor = await prisma.vendorAccount.findUnique({
    where : { id: vendorId },
    select: { id: true, status: true, countryId: true },
  })
  if (!vendor) throw new ApiError(404, "Vendor account not found", "NOT_FOUND")
  if (vendor.status !== "ACTIVE") throw new ApiError(403, "Your account is not active", "ACCOUNT_INACTIVE")
  return vendor
}

//* Flag checks — mirrors runFlagChecks in vendor.outlet.service.ts exactly
//* (same profanity library, same "collect reasons, don't short-circuit"
//* shape), applied to a vendor's public-facing profile copy instead of an
//* outlet's name.

function runProfanityCheck(fields: { displayName: string; tagline?: string | null; description?: string | null; story?: string | null }): boolean {
  const blobs = [fields.displayName, fields.tagline, fields.description, fields.story].filter((v): v is string => !!v)
  return blobs.some((text) => profanityFilter.isProfane(text))
}

//* Same-country duplicate display name — a public brand identity should be
//* unique within one market (impersonation risk); deliberately not a
//* cross-country check, same reasoning as VM-P2-02's duplicate-payout
//* detection staying country-scoped (a match outside the admin's own
//* market isn't actionable for them and shouldn't be implied as one).
async function hasDuplicateDisplayName(displayName: string, vendorAccountId: string, countryId: string): Promise<boolean> {
  const dup = await prisma.vendorProfile.findFirst({
    where : {
      displayName    : { equals: displayName, mode: "insensitive" },
      vendorAccountId: { not: vendorAccountId },
      vendorAccount  : { countryId },
    },
    select: { id: true },
  })
  return !!dup
}

function logFlagEvent(profileId: string, flagReasons: string[], context: "created" | "updated") {
  auditService.log({
    adminUserId: SYSTEM_USER_ID,
    action     : "vendor_profile.flagged",
    entityType : "VendorProfile",
    entityId   : profileId,
    changes    : { after: { flagReasons } },
    metadata   : { context },
  })
}

//* Get

export async function getVendorProfile(vendorId: string) {
  await loadActiveVendor(vendorId)
  return prisma.vendorProfile.findUnique({ where: { vendorAccountId: vendorId } })
}

//* Create or update — a full-form save, not a partial PATCH (see
//* UpsertVendorProfileRequest). Flags are only recomputed when a
//* profanity-relevant text field actually changes, same as
//* vendor.outlet.service.ts's updateOutlet — editing an unrelated field
//* (e.g. website) never disturbs a MANUALLY_APPROVED status an admin
//* already granted.

export async function upsertVendorProfile(vendorId: string, input: UpsertVendorProfileRequest) {
  const vendor = await loadActiveVendor(vendorId)

  const displayName = input.displayName?.trim()
  if (!displayName) throw new ApiError(400, "displayName is required", "MISSING_FIELDS")

  const existing = await prisma.vendorProfile.findUnique({ where: { vendorAccountId: vendorId } })

  const tagline     = input.tagline?.trim()     || null
  const description = input.description?.trim() || null
  const story       = input.story?.trim()       || null

  const contentChanged = !existing
    || existing.displayName !== displayName
    || existing.tagline     !== tagline
    || existing.description !== description
    || existing.story       !== story

  let reviewStatus: ProfileReviewStatus = existing?.reviewStatus ?? ProfileReviewStatus.AUTO_APPROVED
  let flagReasons  = existing?.flagReasons ?? []
  let flaggedAt    = existing?.flaggedAt ?? null
  let rejectionReason = existing?.rejectionReason ?? null

  if (contentChanged) {
    const reasons: string[] = []
    if (runProfanityCheck({ displayName, tagline, description, story })) reasons.push("INAPPROPRIATE_CONTENT")
    if (await hasDuplicateDisplayName(displayName, vendorId, vendor.countryId)) reasons.push("DUPLICATE_DISPLAY_NAME")

    flagReasons  = reasons
    reviewStatus = reasons.length > 0 ? ProfileReviewStatus.FLAGGED : ProfileReviewStatus.AUTO_APPROVED
    flaggedAt    = reasons.length > 0 ? new Date() : null
    // A fresh edit supersedes a prior admin rejection — it gets a clean
    // re-check rather than staying permanently marked rejected.
    rejectionReason = null
  }

  const data = {
    displayName,
    tagline,
    description,
    story,
    logoUrl         : input.logoUrl?.trim()         || null,
    coverImageUrl   : input.coverImageUrl?.trim()   || null,
    publicEmail     : input.publicEmail?.trim()     || null,
    publicPhone     : input.publicPhone?.trim()     || null,
    website         : input.website?.trim()         || null,
    socialLinks     : input.socialLinks ? (JSON.parse(JSON.stringify(input.socialLinks)) as Prisma.InputJsonValue) : Prisma.JsonNull,
    reservationLink : input.reservationLink?.trim() || null,
    primaryCuisineId: input.primaryCuisineId || null,
    specialties     : input.specialties ?? [],
    dietaryOptions  : input.dietaryOptions ?? [],
    foundedYear     : input.foundedYear ?? null,
    reviewStatus,
    flagReasons,
    flaggedAt,
    rejectionReason,
  }

  const profile = existing
    ? await prisma.vendorProfile.update({ where: { id: existing.id }, data })
    : await prisma.vendorProfile.create({ data: { vendorAccountId: vendorId, ...data } })

  if (contentChanged && reviewStatus === ProfileReviewStatus.FLAGGED) {
    serviceLog.warn({ vendorId, profileId: profile.id, flagReasons }, "Vendor profile flagged — pending admin review")
    logFlagEvent(profile.id, flagReasons, existing ? "updated" : "created")
  } else {
    serviceLog.info({ vendorId, profileId: profile.id }, existing ? "Vendor profile updated" : "Vendor profile created")
  }

  return profile
}

//* Go-live status — payout + profile + outlet, following how Uber Eats /
//* Bolt Food gate a merchant's storefront going live. Computed live, never
//* stored (see VendorGoLiveStatus).

export async function getVendorGoLiveStatus(vendorId: string): Promise<VendorGoLiveStatus> {
  const [verifiedPayoutCount, activeOutletCount, profile] = await Promise.all([
    prisma.vendorPayoutAccount.count({
      where: { vendorId, isActive: true, deletedAt: null, verificationStatus: PayoutVerificationStatus.VERIFIED },
    }),
    prisma.outlet.count({
      where: { vendorId, deletedAt: null, adminStatus: OutletAdminStatus.ACTIVE },
    }),
    prisma.vendorProfile.findUnique({
      where : { vendorAccountId: vendorId },
      select: { isPublished: true, reviewStatus: true },
    }),
  ])

  const hasVerifiedPayoutAccount = verifiedPayoutCount > 0
  const hasActiveOutlet          = activeOutletCount > 0
  const hasProfile               = !!profile
  const isProfileReviewClear     = profile
    ? profile.reviewStatus === ProfileReviewStatus.AUTO_APPROVED || profile.reviewStatus === ProfileReviewStatus.MANUALLY_APPROVED
    : false

  const blockers: string[] = []
  if (!hasVerifiedPayoutAccount) blockers.push("VERIFIED_PAYOUT_ACCOUNT")
  if (!hasProfile) blockers.push("PROFILE")
  else if (!isProfileReviewClear) blockers.push("PROFILE_UNDER_REVIEW")
  if (!hasActiveOutlet) blockers.push("OUTLET")

  return {
    hasVerifiedPayoutAccount,
    hasActiveOutlet,
    hasProfile,
    isProfileReviewClear,
    isPublished: profile?.isPublished ?? false,
    canGoLive  : blockers.length === 0,
    blockers,
  }
}

//* Publish — the actual "go live" action. Enforced server-side, not just
//* hinted in the UI (the vendor-dashboard also disables the button using
//* getVendorGoLiveStatus, but that's UX, not the gate).

export async function publishVendorProfile(vendorId: string) {
  await loadActiveVendor(vendorId)

  const profile = await prisma.vendorProfile.findUnique({ where: { vendorAccountId: vendorId } })
  if (!profile) throw new ApiError(400, "Create your public profile before going live", "PROFILE_NOT_FOUND")
  if (profile.reviewStatus === ProfileReviewStatus.FLAGGED) {
    throw new ApiError(400, "Your profile is pending review and cannot be published yet", "PROFILE_UNDER_REVIEW")
  }
  if (profile.reviewStatus === ProfileReviewStatus.MANUALLY_REJECTED) {
    throw new ApiError(
      400,
      profile.rejectionReason ? `Your profile was rejected: ${profile.rejectionReason}` : "Your profile was rejected by an admin",
      "PROFILE_REJECTED",
    )
  }

  const status = await getVendorGoLiveStatus(vendorId)
  if (!status.hasVerifiedPayoutAccount) throw new ApiError(400, "Add and verify a payout account before going live", "PAYOUT_ACCOUNT_REQUIRED")
  if (!status.hasActiveOutlet) throw new ApiError(400, "Add at least one outlet before going live", "OUTLET_REQUIRED")

  const updated = await prisma.vendorProfile.update({
    where: { id: profile.id },
    data : { isPublished: true, publishedAt: new Date() },
  })

  serviceLog.info({ vendorId, profileId: profile.id }, "Vendor profile published — vendor is live")
  return updated
}

export async function unpublishVendorProfile(vendorId: string) {
  await loadActiveVendor(vendorId)

  const profile = await prisma.vendorProfile.findUnique({ where: { vendorAccountId: vendorId } })
  if (!profile) throw new ApiError(404, "Profile not found", "NOT_FOUND")
  if (!profile.isPublished) throw new ApiError(400, "Profile is already unpublished", "ALREADY_UNPUBLISHED")

  const updated = await prisma.vendorProfile.update({
    where: { id: profile.id },
    data : { isPublished: false },
  })

  serviceLog.info({ vendorId, profileId: profile.id }, "Vendor profile unpublished by vendor")
  return updated
}
