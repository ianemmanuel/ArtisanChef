import { prisma, Prisma, PayoutVerificationStatus, PaymentDirection } from "@repo/db"
import { ApiError } from "@/middleware/error"
import { logger } from "@/lib/pino/logger"
import { AddPayoutAccountRequest } from "@repo/types/backend"
import {
  encryptOptional,
  decryptOptional,
  blindIndexOptional,
  maskTail,
} from "@/lib/crypto/field-encryption"
import { getPayoutVerificationProvider, bestNameMatch } from "@/lib/payout-verification"
import {
  PAYOUT_ADD_VELOCITY_MAX,
  PAYOUT_ADD_VELOCITY_WINDOW_DAYS,
  PAYOUT_NAME_MATCH_MIN,
} from "@/constants/vendor"

const serviceLog = logger.child({ module: "vendor-payout-service" })

/*
 * CLAUDE.md #7 — payout hardening, no external API.
 *
 *   • The six sensitive banking identifiers (bankCode, accountNumber,
 *     swiftCode, iban, routingNumber, mobileNumber) are AES-256-GCM
 *     encrypted at rest. presentPayoutAccount() is the only exit to a client
 *     and it returns `masked` ("••••1234") only — never the plaintext,
 *     even to the owning vendor (matches Stripe / every serious platform).
 *   • accountNumberHash / mobileNumberHash are keyed HMAC blind indexes so
 *     admin duplicate-detection can match across vendors without decrypting.
 *   • getPayoutVerificationProvider() runs structural checksums (IBAN mod-97,
 *     ABA, MSISDN) — a malformed identifier is a 400 before the row exists.
 *   • A weak account-holder-name match, add-velocity, or a shared identifier
 *     with another vendor sets riskFlags and routes the account to
 *     REQUIRES_REVIEW instead of the silent PENDING queue.
 */

// The banking identifiers stored as ciphertext. paypalEmail / stripeAccountId
// are contact identifiers, not bank credentials — left in the clear.
type SensitiveField = "bankCode" | "accountNumber" | "swiftCode" | "iban" | "routingNumber" | "mobileNumber"
const SENSITIVE_FIELDS: SensitiveField[] = ["bankCode", "accountNumber", "swiftCode", "iban", "routingNumber", "mobileNumber"]

export interface PayoutMaskedDetails {
  bankCode?     : string
  accountNumber?: string
  swiftCode?    : string
  iban?         : string
  routingNumber?: string
  mobileNumber? : string
}

/** Row shape returned to clients — ciphertext fields dropped, `masked` added.
 *  Exported so admin.vendor.service.ts's getVendorAccount presents payout
 *  accounts through the exact same encryption boundary.
 *
 *  `includeRiskSignals` is admin-only: riskFlags / nameMatchScore /
 *  verificationMeta are internal review signals (DUPLICATE_IDENTIFIER in
 *  particular would confirm another vendor's account number to this one) —
 *  the vendor-facing endpoints strip them. */
export function presentPayoutAccount(account: object, opts: { includeRiskSignals?: boolean } = {}): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(account as Record<string, unknown>) }
  for (const f of SENSITIVE_FIELDS) delete out[f]
  const rawMask = out.maskedDetails
  out.masked = rawMask && typeof rawMask === "object" ? (rawMask as PayoutMaskedDetails) : null
  delete out.maskedDetails
  delete out.accountNumberHash
  delete out.mobileNumberHash
  if (!opts.includeRiskSignals) {
    delete out.riskFlags
    delete out.nameMatchScore
    delete out.verificationMeta
  }
  return out
}

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
    select: { id: true, countryId: true, status: true, legalBusinessName: true, ownerFirstName: true, ownerLastName: true },
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
  if (type === "DIGITAL_WALLET" && !input.paypalEmail && !input.stripeAccountId) {
    throw new ApiError(400, "A wallet identifier is required", "MISSING_FIELDS")
  }

  // Structural verification — malformed identifiers never reach the database.
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
  })
  if (outcome.fieldErrors && outcome.fieldErrors.length > 0) {
    throw new ApiError(400, outcome.fieldErrors.join("; "), "INVALID_ACCOUNT_DETAILS")
  }

  // --- Risk signals (advisory; they route to review, they don't block) ---
  const riskFlags: string[] = []

  const nameMatchScore = bestNameMatch(input.accountHolderName, [
    vendor.legalBusinessName,
    `${vendor.ownerFirstName} ${vendor.ownerLastName}`,
  ])
  if (nameMatchScore !== null && nameMatchScore < PAYOUT_NAME_MATCH_MIN) {
    riskFlags.push("NAME_MISMATCH")
  }

  const velocityWindowStart = new Date(Date.now() - PAYOUT_ADD_VELOCITY_WINDOW_DAYS * 86_400_000)
  const recentAdds = await prisma.vendorPayoutAccount.count({
    where: { vendorId, createdAt: { gte: velocityWindowStart } }, // includes since-removed rows on purpose
  })
  if (recentAdds >= PAYOUT_ADD_VELOCITY_MAX) riskFlags.push("ADD_VELOCITY")

  const accountNumberHash = blindIndexOptional(input.accountNumber)
  const mobileNumberHash  = blindIndexOptional(input.mobileNumber)
  const dupHashes = [accountNumberHash, mobileNumberHash].filter((h): h is string => !!h)
  if (dupHashes.length > 0) {
    const dupCount = await prisma.vendorPayoutAccount.count({
      where: {
        vendorId : { not: vendorId },
        deletedAt: null,
        vendor   : { countryId: vendor.countryId },
        OR       : dupHashes.flatMap((h) => [{ accountNumberHash: h }, { mobileNumberHash: h }]),
      },
    })
    if (dupCount > 0) riskFlags.push("DUPLICATE_IDENTIFIER")
  }

  const verificationStatus: PayoutVerificationStatus =
    riskFlags.length > 0
      ? PayoutVerificationStatus.REQUIRES_REVIEW
      : outcome.status === "VERIFIED"
        ? PayoutVerificationStatus.VERIFIED
        : outcome.status === "REQUIRES_REVIEW"
          ? PayoutVerificationStatus.REQUIRES_REVIEW
          : PayoutVerificationStatus.PENDING

  // --- Encrypt sensitive fields + build the masked display object ---
  const masked: PayoutMaskedDetails = {}
  for (const f of SENSITIVE_FIELDS) {
    const v = input[f]?.trim()
    if (v) masked[f] = maskTail(v)
  }

  // First active account becomes default automatically
  const existingActive = await prisma.vendorPayoutAccount.count({
    where: { vendorId, isActive: true, deletedAt: null },
  })

  const account = await prisma.vendorPayoutAccount.create({
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
      verificationMethod    : outcome.method,
      verificationMeta      : JSON.parse(JSON.stringify({ outcome, riskFlags, nameMatchScore })) as Prisma.InputJsonValue,
    },
    include: {
      countryPaymentMethod: {
        include: { paymentMethod: { select: { name: true, type: true, logoUrl: true, code: true } } },
      },
    },
  })

  serviceLog.info(
    { vendorId, accountId: account.id, methodType: type, verificationStatus, riskFlags },
    "Payout account added",
  )

  return presentPayoutAccount(account)
}

//* Remove payout account

export async function removePayoutAccount(vendorId: string, accountId: string) {
    const account = await prisma.vendorPayoutAccount.findUnique({
        where: { id: accountId },
    })

    if (!account || account.deletedAt) throw new ApiError(404, "Payout account not found", "NOT_FOUND")
    if (account.vendorId !== vendorId) throw new ApiError(403, "Unauthorized", "FORBIDDEN")

    if (account.isDefault) {
        // Check if there's another account that can take over as default
        const others = await prisma.vendorPayoutAccount.count({
        where: { vendorId, isActive: true, deletedAt: null, id: { not: accountId } },
        })
        if (others === 0) {
        throw new ApiError(
            400,
            "You cannot remove your only payout account. Add another account first.",
            "CANNOT_REMOVE_ONLY_ACCOUNT",
        )
        }
        // Auto-promote the oldest remaining account to default
        const next = await prisma.vendorPayoutAccount.findFirst({
        where  : { vendorId, isActive: true, deletedAt: null, id: { not: accountId } },
        orderBy: { createdAt: "asc" },
        })
        if (next) {
        await prisma.vendorPayoutAccount.update({
            where: { id: next.id },
            data : { isDefault: true },
        })
        }
    }

    await prisma.vendorPayoutAccount.update({
        where: { id: accountId },
        data : { isActive: false, deletedAt: new Date(), isDefault: false },
    })

    serviceLog.info({ vendorId, accountId }, "Payout account removed")
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

  return prisma.countryPaymentMethod.findMany({
    where  : {
      countryId: vendor.countryId,
      direction: PaymentDirection.OUTBOUND,
      status   : "ACTIVE",
    },
    orderBy: { displayOrder: "asc" },
    include: {
      paymentMethod: { select: { name: true, type: true, logoUrl: true, code: true, description: true } },
    },
  })
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
    accountNumber: decryptOptional(a.accountNumber),
    swiftCode    : decryptOptional(a.swiftCode),
    iban         : decryptOptional(a.iban),
    routingNumber: decryptOptional(a.routingNumber),
    mobileNumber : decryptOptional(a.mobileNumber),
  }
}
