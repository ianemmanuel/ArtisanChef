import { prisma, Prisma, PayoutVerificationStatus, PaymentDirection } from "@repo/db"
import { ApiError } from "@/middleware/error"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"
import { SYSTEM_USER_ID } from "@/constants/system"
import { AddPayoutAccountRequest } from "@repo/types/backend"
import {
  encryptOptional,
  decryptOptional,
  blindIndexOptional,
  maskTail,
} from "@/lib/crypto/field-encryption"
import { getPayoutVerificationProvider, bestNameMatch } from "@/lib/payout-verification"
import { resolveProviderGateway } from "@/modules/finance"
import { isOutboundMethodPayable } from "@/modules/finance/providers/provider.capabilities"
import { resolveSupportedBanks, type BankListGateway } from "./vendor.payoutBanks"
import type { VendorSupportedBanks } from "@repo/types/backend"
import { computePayoutRiskFlags, decidePayoutAccountStatus, resolvePayoutFailureCode, type PayoutRiskFlag } from "./vendor.payoutRisk"
import { notifyAdminsPayoutAccountNeedsReview } from "@/lib/payout-verification/admin-review-notify"
import { presentPayoutAccount, SENSITIVE_FIELDS, type PayoutMaskedDetails } from "./vendor.payoutPresentation"
import {
  PAYOUT_ADD_VELOCITY_MAX,
  PAYOUT_ADD_VELOCITY_WINDOW_DAYS,
  PAYOUT_NAME_MATCH_MIN,
} from "@/constants/vendor"

const serviceLog = logger.child({ module: "vendor-payout-service" })

/*
 * CLAUDE.md #7 — payout hardening, no external API. Vendor 1D on top of it —
 * automatic provider-backed verification for BANK accounts (see
 * lib/payout-verification/finance-bank.provider.ts and its own doc comment
 * for the Finance ownership boundary).
 *
 *   • The six sensitive banking identifiers (bankCode, accountNumber,
 *     swiftCode, iban, routingNumber, mobileNumber) are AES-256-GCM
 *     encrypted at rest. presentPayoutAccount() is the only exit to a client
 *     and it returns `masked` ("••••1234") only — never the plaintext,
 *     even to the owning vendor (matches Stripe / every serious platform).
 *   • accountNumberHash / mobileNumberHash are keyed HMAC blind indexes so
 *     admin duplicate-detection can match across vendors without decrypting.
 *   • getPayoutVerificationProvider() automatically calls Finance's
 *     BankAccountResolutionCapability for a BANK account when the vendor's
 *     country has one configured; structural checksums (IBAN mod-97, ABA,
 *     MSISDN) still run first and still gate a malformed identifier with a
 *     400 before the row exists — unchanged from before Vendor 1D.
 *   • A weak account-holder-name match, add-velocity, or a shared identifier
 *     with another vendor sets riskFlags and routes the account to
 *     REQUIRES_REVIEW instead of straight to VERIFIED — the risk decision
 *     itself is the pure, tested vendor.payoutRisk.ts core.
 */

// presentPayoutAccount / PayoutMaskedDetails / SENSITIVE_FIELDS now live in
// vendor.payoutPresentation.ts (pure, unit-tested) — re-exported here so
// admin.vendor.service.ts's existing import keeps working unchanged.
export { presentPayoutAccount, type PayoutMaskedDetails }

// Validates that the CountryPaymentMethod exists, is ACTIVE, is OUTBOUND,
// and belongs to the vendor's registered country.
async function assertValidPayoutMethod(
  countryPaymentMethodId: string,
  vendorCountryId       : string,
) {
  const method = await prisma.countryPaymentMethod.findUnique({
    where  : { id: countryPaymentMethodId },
    include: { paymentMethod: { select: { name: true, type: true } } },
  })

  if (!method) throw new ApiError(404, "Payment method not found", "NOT_FOUND")
  if (method.countryId !== vendorCountryId) throw new ApiError(400, "This payment method is not available in your country", "COUNTRY_MISMATCH")
  if (method.direction !== PaymentDirection.OUTBOUND) throw new ApiError(400, "This payment method cannot be used for payouts", "WRONG_DIRECTION")
  if (method.status !== "ACTIVE") throw new ApiError(400, "This payment method is currently unavailable", "METHOD_INACTIVE")

  return method
}

//* Add payout account

export async function addPayoutAccount(
  vendorId: string,
  input   : AddPayoutAccountRequest,
) {
  const vendor = await prisma.vendorAccount.findUnique({
    where : { id: vendorId },
    select: {
      id: true, countryId: true, status: true, legalBusinessName: true, ownerFirstName: true, ownerLastName: true,
      country: { select: { name: true } },
    },
  })
  if (!vendor) throw new ApiError(404, "Vendor account not found", "NOT_FOUND")
  if (vendor.status !== "ACTIVE") throw new ApiError(403, "Your account has been deactivated", "ACCOUNT_INACTIVE")

  const method = await assertValidPayoutMethod(input.countryPaymentMethodId, vendor.countryId)
  const type = method.paymentMethod.type

  // Minimum required fields per method type
  if (type === "MOBILE_MONEY" && !input.mobileNumber) {
    throw new ApiError(400, "mobileNumber is required for mobile money accounts", "MISSING_FIELDS")
  }
  if (type === "BANK" && (!input.accountNumber || !input.bankName)) {
    throw new ApiError(400, "accountNumber and bankName are required for bank accounts", "MISSING_FIELDS")
  }

  // Vendor 1E — the bank a vendor picks must originate from the authoritative
  // supported-bank list (Finance's BANK_LIST capability), not be invented by
  // the client. Only enforced when a list is actually available for this
  // vendor's country/provider; when it isn't (supported: false — capability
  // not configured yet) the manual bankName/bankCode fallback stays allowed.
  // On a match we also canonicalise the display name from the provider list.
  if (type === "BANK") {
    const supported = await listSupportedBanks(vendorId)
    if (supported.supported && supported.banks.length > 0) {
      const match = input.bankCode
        ? supported.banks.find((b) => b.code === input.bankCode)
        : undefined
      if (!match) {
        throw new ApiError(400, "Select your bank from the supported list", "BANK_NOT_IN_SUPPORTED_LIST")
      }
      input.bankName = match.name
    }
  }
  if (type === "DIGITAL_WALLET" && !input.paypalEmail && !input.stripeAccountId) {
    throw new ApiError(400, "A wallet identifier is required", "MISSING_FIELDS")
  }

  // BANK is the only method type with a provider verification capability
  // today (BANK_ACCOUNT_RESOLUTION) — its request is currency-discriminated,
  // so resolve the vendor's country currency once, up front. Absent (country
  // has no CountryFinancialConfig yet) => the verification provider falls
  // back to the pre-Vendor-1D offline path automatically, nothing throws.
  const currency = type === "BANK"
    ? (await prisma.countryFinancialConfig.findUnique({
        where : { countryId: vendor.countryId },
        select: { currencyCode: true },
      }))?.currencyCode ?? null
    : null

  // Automatic verification. For BANK, this calls Finance's provider gateway
  // (getPayoutVerificationProvider() -> finance-bank.provider.ts); every
  // other method type — and any BANK account whose country isn't configured
  // for it yet — still runs the offline structural checks it always did. A
  // malformed identifier (bad IBAN checksum, an implausible phone number)
  // never reaches the database either way.
  const outcome = await getPayoutVerificationProvider().verify({
    methodType       : type,
    accountHolderName: input.accountHolderName,
    bankName         : input.bankName,
    bankCode         : input.bankCode,
    accountNumber    : input.accountNumber,
    swiftCode        : input.swiftCode,
    iban             : input.iban,
    routingNumber    : input.routingNumber,
    mobileNetwork    : input.mobileNetwork,
    mobileNumber     : input.mobileNumber,
    paypalEmail      : input.paypalEmail,
    stripeAccountId  : input.stripeAccountId,
    countryId        : vendor.countryId,
    currency,
  })
  if (outcome.fieldErrors && outcome.fieldErrors.length > 0) {
    throw new ApiError(400, outcome.fieldErrors.join("; "), "INVALID_ACCOUNT_DETAILS")
  }

  // --- Risk signals (advisory; they route to review, they don't block) ---
  // Name match: when the provider itself resolved an account-holder name,
  // that's the authoritative thing to compare against the vendor's legal
  // identity (spec §10) — it's what the bank actually says, not what the
  // vendor typed. Falls back to the vendor-typed name when no provider name
  // is available (every non-verified path), unchanged from before Vendor 1D.
  const verifiedAccountName = typeof outcome.meta?.verifiedAccountName === "string" ? outcome.meta.verifiedAccountName : null
  const nameMatchScore = bestNameMatch(verifiedAccountName || input.accountHolderName, [
    vendor.legalBusinessName,
    `${vendor.ownerFirstName} ${vendor.ownerLastName}`,
  ])

  const velocityWindowStart = new Date(Date.now() - PAYOUT_ADD_VELOCITY_WINDOW_DAYS * 86_400_000)
  const recentAdds = await prisma.vendorPayoutAccount.count({
    where: { vendorId, createdAt: { gte: velocityWindowStart } }, // includes since-removed rows on purpose
  })

  const accountNumberHash = blindIndexOptional(input.accountNumber)
  const mobileNumberHash  = blindIndexOptional(input.mobileNumber)
  const dupHashes = [accountNumberHash, mobileNumberHash].filter((h): h is string => !!h)
  let isDuplicate = false
  if (dupHashes.length > 0) {
    const dupCount = await prisma.vendorPayoutAccount.count({
      where: {
        vendorId : { not: vendorId },
        deletedAt: null,
        vendor   : { countryId: vendor.countryId },
        OR       : dupHashes.flatMap((h) => [{ accountNumberHash: h }, { mobileNumberHash: h }]),
      },
    })
    isDuplicate = dupCount > 0
  }

  // The one place the risk decision is made — pure, tested (vendor.payoutRisk.ts).
  const riskFlags: PayoutRiskFlag[] = computePayoutRiskFlags({
    nameMatchScore,
    nameMatchMin       : PAYOUT_NAME_MATCH_MIN,
    isDuplicate,
    addVelocityExceeded: recentAdds >= PAYOUT_ADD_VELOCITY_MAX,
  })
  const verificationStatus = decidePayoutAccountStatus(outcome.status, riskFlags) as PayoutVerificationStatus
  const verificationFailureCode = resolvePayoutFailureCode(verificationStatus, outcome.failureCode, riskFlags)
  // Safe, human-readable "why" for the vendor + ERP — never account data.
  // For a provider-VERIFIED account that risk routed to REQUIRES_REVIEW,
  // outcome.reason would read "confirmed by the provider" (misleading), so
  // use review wording there instead.
  const safeReason =
    verificationStatus === "VERIFIED"
      ? null
      : verificationStatus === "REQUIRES_REVIEW" && outcome.status === "VERIFIED"
        ? "Your payout account needs a manual review before it can be used."
        : outcome.reason ?? null

  // --- Encrypt sensitive fields + build the masked display object ---
  const masked: PayoutMaskedDetails = {}
  for (const f of SENSITIVE_FIELDS) {
    const v = input[f]?.trim()
    if (v) masked[f] = maskTail(v)
  }

  // First active account becomes default automatically. The count + create
  // run in one transaction so two concurrent adds can't both read "0
  // existing" and both become default (spec §21 — concurrent requests must
  // never leave the account set in a contradictory state).
  const account = await prisma.$transaction(async (tx) => {
    const existingActive = await tx.vendorPayoutAccount.count({
      where: { vendorId, isActive: true, deletedAt: null },
    })

    return tx.vendorPayoutAccount.create({
      data: {
        vendorId,
        countryPaymentMethodId: input.countryPaymentMethodId,
        isDefault             : existingActive === 0,
        accountHolderName     : input.accountHolderName,
        mobileNetwork         : input.mobileNetwork ?? null,
        bankName              : input.bankName      ?? null,
        branchName            : input.branchName    ?? null,
        paypalEmail           : input.paypalEmail   ?? null,
        stripeAccountId       : input.stripeAccountId ?? null,
        // encrypted at rest
        bankCode              : encryptOptional(input.bankCode),
        branchCode            : encryptOptional(input.branchCode),
        accountNumber         : encryptOptional(input.accountNumber),
        swiftCode             : encryptOptional(input.swiftCode),
        iban                  : encryptOptional(input.iban),
        routingNumber         : encryptOptional(input.routingNumber),
        mobileNumber          : encryptOptional(input.mobileNumber),
        accountNumberHash,
        mobileNumberHash,
        maskedDetails         : Object.keys(masked).length > 0
          ? (JSON.parse(JSON.stringify(masked)) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        nameMatchScore,
        riskFlags,
        verificationStatus,
        verificationFailureCode,
        verificationMethod    : outcome.method,
        // Safe "why" for any non-VERIFIED outcome — FAILED, REQUIRES_REVIEW,
        // or a PENDING that's awaiting manual review because the provider
        // can't verify this currency. Never account data (guaranteed safe
        // upstream). Same field the manual admin-reject path already uses.
        failureReason         : safeReason,
        // verifiedAt marks *when* an automatic VERIFIED happened; verifiedBy
        // stays null here — it's "adminUserId if MANUAL" (see schema), and
        // this path isn't manual.
        verifiedAt            : verificationStatus === "VERIFIED" ? new Date() : null,
        // Never the raw identifiers — outcome.meta only ever holds safe,
        // derived fields (see finance-bank.provider.ts). riskFlags/
        // nameMatchScore are already columns; kept here too only for a
        // single-glance audit record alongside the provider outcome.
        verificationMeta      : JSON.parse(JSON.stringify({ outcome, riskFlags, nameMatchScore })) as Prisma.InputJsonValue,
      },
      include: {
        countryPaymentMethod: {
          include: { paymentMethod: { select: { name: true, type: true, logoUrl: true, code: true } } },
        },
      },
    })
  })

  serviceLog.info(
    { vendorId, accountId: account.id, methodType: type, verificationStatus, riskFlags, verificationMethod: outcome.method },
    "Payout account added",
  )
  auditService.log({
    adminUserId: SYSTEM_USER_ID, // vendor self-service action — same convention as outlet.flagged
    action     : "vendor_payout_account.added",
    entityType : "VendorPayoutAccount",
    entityId   : account.id,
    changes    : { after: { verificationStatus, verificationFailureCode, verificationMethod: outcome.method, methodType: type } },
    metadata   : { vendorId, riskFlags },
  })

  if (verificationStatus === "FAILED" || verificationStatus === "REQUIRES_REVIEW") {
    void notifyVendorAboutVerificationOutcome(vendorId, account.id, verificationStatus)
    // §14/§15 — the ERP-side operational signal, scoped to admins who can act
    // on this country. Best-effort; never blocks account creation.
    const maskedAccount =
      masked.accountNumber ?? masked.iban ?? masked.mobileNumber ?? input.paypalEmail ?? input.stripeAccountId ?? "—"
    void notifyAdminsPayoutAccountNeedsReview({
      accountId    : account.id,
      vendorId,
      vendorName   : vendor.legalBusinessName,
      countryId    : vendor.countryId,
      countryName  : vendor.country?.name ?? "—",
      bankLabel    : input.bankName ?? method.paymentMethod.name,
      maskedAccount,
      status       : verificationStatus,
    })
  }

  return presentPayoutAccount(account)
}

/*
 * Best-effort vendor-facing nudge for the two "needs attention" outcomes —
 * VERIFIED/PENDING are visible immediately in /setup/payout and don't need
 * one. Deliberately generic wording, never a raw risk-flag code (spec §16:
 * the vendor never needs to see "ADD_VELOCITY"). A write failure here must
 * never fail account creation — the account is already committed.
 */
async function notifyVendorAboutVerificationOutcome(
  vendorId : string,
  accountId: string,
  status   : "FAILED" | "REQUIRES_REVIEW",
): Promise<void> {
  try {
    await prisma.vendorNotification.create({
      data: {
        vendorId,
        type: status === "FAILED" ? "PAYOUT_VERIFICATION_FAILED" : "PAYOUT_REVIEW_REQUIRED",
        title: status === "FAILED" ? "Payout account verification failed" : "Payout account needs review",
        message: status === "FAILED"
          ? "We couldn't verify your payout account. Please check the details and add it again."
          : "We're reviewing your payout account. We'll let you know once it's ready.",
        metadata: { accountId },
      },
    })
  } catch (err) {
    serviceLog.warn({ err, vendorId, accountId }, "Failed to write payout verification notification")
  }
}

//* Remove (deactivate) a payout account.
//
// This is a SOFT delete — the row stays (isActive:false, deletedAt set) so a
// verified/previously-usable payout destination is never physically erased
// (§8: financial history is preserved; a future payout run must still be able
// to resolve which account it paid). What changes here vs. before is WHICH
// accounts a vendor may clear on their own:
//
//   • A non-VERIFIED account (PENDING / FAILED / REQUIRES_REVIEW) never
//     became a real payout destination — the vendor may always remove it,
//     even if it's their only one, so a bad first attempt isn't a dead end
//     (§7 "correct/replace/retry").
//   • A VERIFIED account that is the vendor's only active one can't be
//     removed directly — they must add + get a replacement verified first
//     (replacement semantics, §7), so they're never left with zero usable
//     accounts by a single click.

export async function removePayoutAccount(vendorId: string, accountId: string) {
  const account = await prisma.vendorPayoutAccount.findUnique({ where: { id: accountId } })

  if (!account || account.deletedAt) throw new ApiError(404, "Payout account not found", "NOT_FOUND")
  if (account.vendorId !== vendorId) throw new ApiError(403, "Unauthorized", "FORBIDDEN")

  const isVerified = account.verificationStatus === PayoutVerificationStatus.VERIFIED

  await prisma.$transaction(async (tx) => {
    const otherVerified = await tx.vendorPayoutAccount.findFirst({
      where  : { vendorId, isActive: true, deletedAt: null, id: { not: accountId }, verificationStatus: PayoutVerificationStatus.VERIFIED },
      orderBy: { createdAt: "asc" },
    })

    // Removing a VERIFIED account that's the vendor's LAST verified one would
    // leave them unable to be paid out — force replace-first (§7).
    if (isVerified && !otherVerified) {
      throw new ApiError(
        400,
        "This is your only verified payout account. Add another account and get it verified first, then remove this one.",
        "CANNOT_REMOVE_ONLY_VERIFIED_ACCOUNT",
      )
    }

    // If the account being removed is the default, hand the flag to another
    // VERIFIED account — never to a non-verified one.
    if (account.isDefault && otherVerified) {
      await tx.vendorPayoutAccount.update({ where: { id: otherVerified.id }, data: { isDefault: true } })
    }

    await tx.vendorPayoutAccount.update({
      where: { id: accountId },
      data : { isActive: false, deletedAt: new Date(), isDefault: false },
    })
  })

  serviceLog.info({ vendorId, accountId, wasVerified: isVerified }, "Payout account removed")
  auditService.log({
    adminUserId: SYSTEM_USER_ID,
    action     : "vendor_payout_account.removed",
    entityType : "VendorPayoutAccount",
    entityId   : accountId,
    changes    : { before: { verificationStatus: account.verificationStatus, isActive: true }, after: { isActive: false } },
    metadata   : { vendorId },
  })
  return { success: true }
}

//* Set default payout account

export async function setDefaultPayoutAccount(vendorId: string, accountId: string) {
    const account = await prisma.vendorPayoutAccount.findUnique({
        where: { id: accountId },
    })

    if (!account || account.deletedAt) throw new ApiError(404, "Payout account not found", "NOT_FOUND")
    if (account.vendorId !== vendorId)  throw new ApiError(403, "Unauthorized", "FORBIDDEN")
    if (!account.isActive) throw new ApiError(400, "This account is not active", "ACCOUNT_INACTIVE")

    if (account.verificationStatus !== PayoutVerificationStatus.VERIFIED) {
        throw new ApiError(
        400,
        "Only verified accounts can be set as default",
        "ACCOUNT_NOT_VERIFIED",
        )
    }

    await prisma.$transaction([
        prisma.vendorPayoutAccount.updateMany({
        where: { vendorId, deletedAt: null },
        data : { isDefault: false },
        }),
        prisma.vendorPayoutAccount.update({
        where: { id: accountId },
        data : { isDefault: true },
        }),
    ])

    serviceLog.info({ vendorId, accountId }, "Default payout account updated")
    auditService.log({
        adminUserId: SYSTEM_USER_ID,
        action     : "vendor_payout_account.default_changed",
        entityType : "VendorPayoutAccount",
        entityId   : accountId,
        changes    : { after: { isDefault: true } },
        metadata   : { vendorId },
    })
    return { success: true }
}

//* List payout accounts

export async function listPayoutAccounts(vendorId: string) {
  const accounts = await prisma.vendorPayoutAccount.findMany({
    where  : { vendorId, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include: {
      countryPaymentMethod: {
        include: { paymentMethod: { select: { name: true, type: true, logoUrl: true, code: true } } },
      },
    },
  })
  return accounts.map((a) => presentPayoutAccount(a))
}

//* Get single payout account
// Full record minus the encrypted identifiers — the vendor sees the masked
// forms (••••1234) and verification status, never the raw numbers back.

export async function getPayoutAccount(vendorId: string, accountId: string) {
  const account = await prisma.vendorPayoutAccount.findUnique({
    where  : { id: accountId },
    include: {
      countryPaymentMethod: {
        include: {
          paymentMethod: { select: { name: true, type: true, logoUrl: true, code: true, description: true } },
        },
      },
    },
  })

  if (!account || account.deletedAt) throw new ApiError(404, "Payout account not found", "NOT_FOUND")
  if (account.vendorId !== vendorId)  throw new ApiError(403, "Unauthorized", "FORBIDDEN")

  return presentPayoutAccount(account)
}

//* Get available payout methods for vendor's country

export async function getAvailablePayoutMethods(vendorId: string) {
  const vendor = await prisma.vendorAccount.findUnique({
    where : { id: vendorId },
    select: { countryId: true },
  })
  if (!vendor) throw new ApiError(404, "Vendor account not found", "NOT_FOUND")

  const methods = await prisma.countryPaymentMethod.findMany({
    where  : {
      countryId: vendor.countryId,
      direction: PaymentDirection.OUTBOUND,
      status   : "ACTIVE",
    },
    orderBy: { displayOrder: "asc" },
    include: {
      paymentMethod: { select: { name: true, type: true, logoUrl: true, code: true, description: true } },
      countryProviderAccount: {
        select: {
          status: true,
          enabledCapabilities: true,
          paymentProvider: { select: { status: true } },
        },
      },
    },
  })

  // A vendor may only be offered a method that can ACTUALLY execute a payout
  // today: it must be bound (on the Finance page) to a provider account that
  // is ACTIVE, whose provider is ACTIVE, and that enables the payout
  // capability this method type needs (PAYOUT_BANK / PAYOUT_MOBILE_MONEY).
  // The capability rule is Finance's — reused via methodProviderAccountProblem,
  // never re-implemented here. An unwired or unusable method is silently
  // dropped rather than offered and then failing at account creation.
  return methods
    .filter((m) =>
      isOutboundMethodPayable({
        methodType: m.paymentMethod.type,
        account: m.countryProviderAccount
          ? {
              status: m.countryProviderAccount.status,
              enabledCapabilities: m.countryProviderAccount.enabledCapabilities,
              providerStatus: m.countryProviderAccount.paymentProvider.status,
            }
          : null,
      }),
    )
    // Reshape to the vendor-facing contract — the provider account was only
    // needed to decide eligibility; its status/capabilities never leave the
    // backend.
    .map((m) => ({
      id          : m.id,
      countryId   : m.countryId,
      direction   : m.direction,
      status      : m.status,
      displayOrder: m.displayOrder,
      paymentMethod: m.paymentMethod,
    }))
}

//* List supported banks (Vendor 1E)
//
// Vendor UI -> here -> Finance's provider gateway -> the active provider's
// own BANK_LIST capability -> normalized -> here -> Vendor UI. This
// function is the ONLY place the vendor domain touches Finance for this —
// it never knows which provider is configured, its endpoint, or its
// response shape (Flutterwave's /banks lives entirely in
// flutterwave.adapter.ts). The country is always the CALLER'S OWN
// registered country, resolved server-side — nothing here accepts a
// country from the request, so there's no way to request another
// country's bank list.
//
// `code` in each returned bank is the exact value that must come back as
// AddPayoutAccountRequest.bankCode — the same identifier the bank
// resolution verification capability (finance-bank.provider.ts) expects.

const bankListGateway: BankListGateway = {
  async listBanks(countryId, countryCode) {
    const { adapter, ctx } = await resolveProviderGateway(countryId, "BANK_LIST")
    // resolveProviderGateway already asserts the adapter implements the
    // capability it validated before returning — bankList is guaranteed
    // present here (same guarantee finance-bank.provider.ts relies on for
    // bankResolution).
    return adapter.bankList!.listBanks(ctx, { countryCode })
  },
}

export async function listSupportedBanks(vendorId: string): Promise<VendorSupportedBanks> {
  const vendor = await prisma.vendorAccount.findUnique({
    where : { id: vendorId },
    select: { countryId: true, country: { select: { code: true } } },
  })
  if (!vendor) throw new ApiError(404, "Vendor account not found", "NOT_FOUND")

  return resolveSupportedBanks(bankListGateway, vendor.countryId, vendor.country.code)
}

/**
 * Internal-only: decrypt a payout account's sensitive identifiers for use by
 * a payout provider when money movement is built. NOT reachable from any
 * route today — exists so the encryption boundary is a single, obvious
 * choke point when that work starts.
 */
export async function decryptPayoutIdentifiers(accountId: string) {
  const a = await prisma.vendorPayoutAccount.findUnique({ where: { id: accountId } })
  if (!a || a.deletedAt) throw new ApiError(404, "Payout account not found", "NOT_FOUND")
  return {
    bankCode     : decryptOptional(a.bankCode),
    branchCode   : decryptOptional(a.branchCode),
    accountNumber: decryptOptional(a.accountNumber),
    swiftCode    : decryptOptional(a.swiftCode),
    iban         : decryptOptional(a.iban),
    routingNumber: decryptOptional(a.routingNumber),
    mobileNumber : decryptOptional(a.mobileNumber),
  }
}
