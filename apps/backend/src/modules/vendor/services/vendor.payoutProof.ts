import path from "node:path"
import { prisma, BankVerificationMode, DocumentStatus, type Prisma } from "@repo/db"
import { ApiError } from "@/middleware/error"
import { R2Service } from "@/lib/r2/r2.service"
import { ALLOWED_MIME_TYPES } from "./vendor.document.service"
import type { PayoutVerificationRequirement } from "@repo/types/backend"

/*
 * Proof-of-ownership documents for a bank payout account — the MANUAL
 * verification path.
 *
 * Why this exists: in markets like Kenya no payment provider can resolve a
 * bank account (verified against dLocal, Flutterwave, Paystack and Fincra —
 * Nigeria has NIBSS name enquiry as an open rail, Kenya's equivalent sits
 * behind PesaLink's member banks). Every marketplace operating there does
 * the same thing instead: the vendor uploads a stamped bank confirmation
 * letter or a recent statement showing the account holder's name and
 * number, and a human checks it against the vendor's legal identity. That's
 * the method this module implements.
 *
 * Deliberately NOT a new subsystem: the requirement is an ordinary
 * DocumentTypeConfig (scope PAYOUT_ACCOUNT, per country, configured in the
 * existing admin document-type UI), the upload is an ordinary
 * VendorDocument (anchored on payoutAccountId), and the review is the payout
 * account's existing verify/reject actions. Nothing new to learn.
 *
 * MANUAL and PROVIDER are separate paths with no fallback between them: a
 * PROVIDER-mode country never asks for a document, a MANUAL-mode country
 * never calls a provider.
 */

/** The country's verification mode + the proof type to ask for, if any. */
export async function getPayoutVerificationRequirement(
  countryId: string,
): Promise<PayoutVerificationRequirement> {
  const config = await prisma.countryFinancialConfig.findUnique({
    where : { countryId },
    select: { bankVerificationMode: true },
  })
  // No financial config yet => nothing automated can run, so the honest
  // answer is MANUAL (the account will go to admin review either way).
  const mode = config?.bankVerificationMode ?? BankVerificationMode.MANUAL
  if (mode !== BankVerificationMode.MANUAL) {
    return { mode: "PROVIDER", proofDocumentType: null }
  }

  const docType = await prisma.documentTypeConfig.findFirst({
    where  : { countryId, scope: "PAYOUT_ACCOUNT", status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select : { id: true, name: true, description: true, instructions: true, sampleUrl: true },
  })
  return { mode: "MANUAL", proofDocumentType: docType ?? null }
}

/*
 * Maps a payout method TYPE to its storage folder. Keyed on the type (a
 * closed enum) rather than the per-country payment-method name, so the
 * folder set stays small and stable: M-Pesa and Airtel Money are both
 * MOBILE_MONEY and belong in one place rather than fragmenting the prefix
 * per network.
 */
const METHOD_FOLDER: Record<string, string> = {
  BANK          : "bank-account",
  MOBILE_MONEY  : "mobile-money",
  DIGITAL_WALLET: "digital-wallet",
  CARD          : "card",
}

export function payoutProofFolder(methodType: string): string {
  return METHOD_FOLDER[methodType] ?? "other"
}

/**
 * Presign an upload for a payout proof document. Same validate -> presign ->
 * PUT -> submit-storageKey pipeline as every other document in the vendor
 * app; only the storage prefix differs (see generatePayoutProofKey).
 */
export async function presignPayoutProofUpload(
  vendorId  : string,
  countryId : string,
  methodType: string,
  input     : { documentTypeId: string; fileName: string; mimeType: string },
) {
  if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
    throw new ApiError(400, "Unsupported file type", "UNSUPPORTED_FILE_TYPE")
  }
  await assertProofDocumentTypeUsable(countryId, input.documentTypeId)

  const extension  = path.extname(input.fileName).replace(".", "")
  const storageKey = R2Service.generatePayoutProofKey(payoutProofFolder(methodType), vendorId, extension)
  const uploadUrl  = await R2Service.generateUploadUrl(storageKey, input.mimeType)
  return { uploadUrl, storageKey }
}

/** The document type must be this country's own, ACTIVE, PAYOUT_ACCOUNT-scoped. */
async function assertProofDocumentTypeUsable(countryId: string, documentTypeId: string) {
  const docType = await prisma.documentTypeConfig.findUnique({
    where : { id: documentTypeId },
    select: { countryId: true, scope: true, status: true },
  })
  // Another country's type must read as "not found", never "wrong country".
  if (!docType || docType.countryId !== countryId) {
    throw new ApiError(404, "Document type not found", "NOT_FOUND")
  }
  if (docType.scope !== "PAYOUT_ACCOUNT") {
    throw new ApiError(400, "That document type is not a payout-account proof", "WRONG_DOCUMENT_SCOPE")
  }
  if (docType.status !== "ACTIVE") {
    throw new ApiError(400, "That document type is no longer in use", "DOCUMENT_TYPE_INACTIVE")
  }
  return docType
}

export interface ProofDocumentInput {
  documentTypeId: string
  storageKey    : string
  documentName? : string
  fileSize?     : number
  mimeType?     : string
}

/*
 * The decision itself — pure, so the mutually-exclusive rules are
 * exhaustively unit-testable without a database (same convention as
 * vendor.payoutRisk.ts / vendor.payoutPresentation.ts).
 *
 *   ATTACH        — persist the submitted proof
 *   SKIP          — no proof applies; carry on
 *   NOT_APPLICABLE— a proof was sent for a non-bank method
 *   NOT_REQUIRED  — a proof was sent to a PROVIDER-mode country
 *   REQUIRED      — MANUAL mode, a type is configured, nothing was sent
 *   WRONG_TYPE    — the wrong document type for this country
 *   MISSING_FILE  — a proof object with no storage key
 */
export type ProofDecision =
  | "ATTACH" | "SKIP"
  | "NOT_APPLICABLE" | "NOT_REQUIRED" | "REQUIRED" | "WRONG_TYPE" | "MISSING_FILE"

export function decideProofRequirement(input: {
  mode              : "PROVIDER" | "MANUAL"
  /** id of the country's configured PAYOUT_ACCOUNT document type, if any. */
  requiredTypeId    : string | null
  methodType        : string
  submittedTypeId?  : string | null
  submittedStorageKey?: string | null
}): ProofDecision {
  const submitted = !!input.submittedTypeId

  // Only BANK accounts are verified this way. Mobile money / wallets keep
  // the structural-check + review path they already had.
  if (input.methodType !== "BANK") return submitted ? "NOT_APPLICABLE" : "SKIP"

  if (input.mode === "PROVIDER") return submitted ? "NOT_REQUIRED" : "SKIP"

  // MANUAL
  if (!input.requiredTypeId) return "SKIP" // country hasn't configured a type yet
  if (!submitted) return "REQUIRED"
  if (input.submittedTypeId !== input.requiredTypeId) return "WRONG_TYPE"
  if (!input.submittedStorageKey?.trim()) return "MISSING_FILE"
  return "ATTACH"
}

const PROOF_ERROR: Record<Exclude<ProofDecision, "ATTACH" | "SKIP">, [string, string]> = {
  NOT_APPLICABLE: ["A proof document is only used for bank accounts", "PROOF_NOT_APPLICABLE"],
  NOT_REQUIRED  : ["Bank accounts in your country are verified automatically — no document is needed", "PROOF_NOT_REQUIRED"],
  REQUIRED      : ["Upload proof of bank-account ownership to continue", "PROOF_DOCUMENT_REQUIRED"],
  WRONG_TYPE    : ["That is not the document your country requires", "WRONG_DOCUMENT_TYPE"],
  MISSING_FILE  : ["The uploaded file is missing", "MISSING_FIELDS"],
}

/**
 * Validate the submitted proof against the country's requirement, BEFORE any
 * row is written. Returns the proof to persist, or null when none applies.
 * The rules live in decideProofRequirement; this only loads the inputs and
 * turns a decision into an ApiError.
 */
export async function resolveProofForCreate(
  countryId : string,
  methodType: string,
  proof     : ProofDocumentInput | undefined,
): Promise<ProofDocumentInput | null> {
  const requirement = await getPayoutVerificationRequirement(countryId)

  const decision = decideProofRequirement({
    mode                : requirement.mode,
    requiredTypeId      : requirement.proofDocumentType?.id ?? null,
    methodType,
    submittedTypeId     : proof?.documentTypeId,
    submittedStorageKey : proof?.storageKey,
  })

  if (decision === "SKIP") return null
  if (decision !== "ATTACH") {
    const [message, code] = PROOF_ERROR[decision]
    throw new ApiError(400, message, code)
  }

  await assertProofDocumentTypeUsable(countryId, proof!.documentTypeId)
  return proof!
}

/**
 * Persist the proof as a VendorDocument anchored to the payout account.
 * Called inside the same transaction that creates the account, so an account
 * is never stored without the proof it requires.
 */
export async function createProofDocument(
  tx             : Prisma.TransactionClient,
  payoutAccountId: string,
  proof          : ProofDocumentInput,
) {
  return tx.vendorDocument.create({
    data: {
      payoutAccountId,
      documentTypeId: proof.documentTypeId,
      storageKey    : proof.storageKey,
      documentName  : proof.documentName ?? null,
      fileSize      : proof.fileSize ?? null,
      mimeType      : proof.mimeType ?? null,
      // PENDING, like every other freshly uploaded document. The admin's
      // verify/reject on the payout ACCOUNT is the decision that matters;
      // this status just mirrors it for a consistent document surface.
      status        : DocumentStatus.PENDING,
    },
  })
}
