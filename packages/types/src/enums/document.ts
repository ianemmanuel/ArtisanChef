
export enum DocumentStatus {
  PENDING    = "PENDING",
  APPROVED   = "APPROVED",
  REJECTED   = "REJECTED",
  EXPIRED    = "EXPIRED",
  SUPERSEDED = "SUPERSEDED",
  WITHDRAWN  = "WITHDRAWN",
}

/*
 * Mirrors Prisma's DocumentScope exactly (hand-synced, same convention as
 * every other mirrored enum here).
 *   VENDOR         — once per vendor account, countrywide
 *   OUTLET         — once per outlet, countrywide
 *   CITY           — tied to one city; uploaded once per vendor per city and
 *                    inherited by that vendor's outlets there
 *   PAYOUT_ACCOUNT — proof of bank-account ownership, once per payout
 *                    account. Only used where a country's
 *                    bankVerificationMode is MANUAL; never part of vendor
 *                    onboarding requirements.
 */
export enum DocumentScope {
  VENDOR         = "VENDOR",
  OUTLET         = "OUTLET",
  CITY           = "CITY",
  PAYOUT_ACCOUNT = "PAYOUT_ACCOUNT",
}

export enum DocumentTypeStatus {
  ACTIVE     = "ACTIVE",
  INACTIVE   = "INACTIVE",
  DEPRECATED = "DEPRECATED",
  ARCHIVED   = "ARCHIVED",
}