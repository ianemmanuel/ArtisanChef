import crypto from "crypto"
import { env } from "@/env"
import { logger } from "@/lib/pino/logger"

/*
 * Field-level encryption for sensitive payout identifiers (bank account
 * numbers, IBANs, routing/SWIFT codes, mobile-money numbers).
 *
 *   • at rest  — AES-256-GCM. Stored as  v1.<iv>.<authTag>.<ciphertext>
 *                (each part base64). GCM gives us authenticated encryption,
 *                so a tampered ciphertext fails to decrypt rather than
 *                returning garbage.
 *   • lookups  — a keyed HMAC-SHA256 "blind index": a deterministic hash of
 *                the normalised value, so we can find "is this same account
 *                number used by another vendor" without ever decrypting.
 *
 * Keys come from env (base64, 32 bytes each). In dev they're optional — we
 * fall back to a fixed, obviously-insecure key with a loud warning, the same
 * "works without the real thing configured" convention SMTP / mock revenue
 * use. env.ts hard-requires both in production.
 */

const CIPHER_VERSION = "v1"
const ALGORITHM = "aes-256-gcm"

const DEV_FALLBACK_ENCRYPTION_KEY = "ZGV2LW9ubHktcGF5b3V0LWVuY3J5cHRpb24ta2V5LTMyIQ==" // "dev-only-payout-encryption-key-32!"
const DEV_FALLBACK_BLIND_INDEX_KEY = "ZGV2LW9ubHktcGF5b3V0LWJsaW5kLWluZGV4LWtleS0zMiE=" // "dev-only-payout-blind-index-key-32!"

let warned = false
function warnOnce() {
  if (warned) return
  warned = true
  logger.warn(
    { module: "field-encryption" },
    "PAYOUT_ENCRYPTION_KEY / PAYOUT_BLIND_INDEX_KEY not set — using an insecure dev fallback. Do NOT use this for real vendor data.",
  )
}

function loadKey(raw: string | undefined, fallback: string): Buffer {
  if (!raw) {
    warnOnce()
    raw = fallback
  }
  const key = Buffer.from(raw, "base64")
  if (key.length !== 32) {
    throw new Error("Encryption key must decode to exactly 32 bytes (base64-encoded)")
  }
  return key
}

const encryptionKey = () => loadKey(env.PAYOUT_ENCRYPTION_KEY, DEV_FALLBACK_ENCRYPTION_KEY)
const blindIndexKey = () => loadKey(env.PAYOUT_BLIND_INDEX_KEY, DEV_FALLBACK_BLIND_INDEX_KEY)

/** True if `value` is already one of our ciphertext envelopes. */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(`${CIPHER_VERSION}.`)
}

/** Encrypt a plaintext string. Returns the `v1.iv.tag.ciphertext` envelope. */
export function encryptField(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [
    CIPHER_VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".")
}

/**
 * Decrypt a `v1.iv.tag.ciphertext` envelope. If `stored` isn't an envelope
 * (e.g. a legacy plaintext row that predates encryption) it's returned as-is
 * with a warning — defensive only; there are no such rows today.
 */
export function decryptField(stored: string): string {
  if (!isEncrypted(stored)) {
    logger.warn({ module: "field-encryption" }, "decryptField called on a non-encrypted value — returning as-is")
    return stored
  }
  const parts = stored.split(".")
  if (parts.length !== 4) throw new Error("Malformed encrypted field envelope")
  const [, ivB64, tagB64, ctB64] = parts as [string, string, string, string]
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivB64, "base64"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  const plain = Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()])
  return plain.toString("utf8")
}

/** Encrypt when present; pass through null/undefined/"" untouched. */
export function encryptOptional(plain: string | null | undefined): string | null {
  const trimmed = plain?.trim()
  return trimmed ? encryptField(trimmed) : null
}

/** Decrypt when present; pass through null/undefined untouched. */
export function decryptOptional(stored: string | null | undefined): string | null {
  return stored ? decryptField(stored) : null
}

/**
 * Normalise a value before hashing / masking so trivial formatting
 * differences ("KE89 3701..." vs "ke89370...") don't defeat the match.
 * Bank/account identifiers → strip whitespace, uppercase. Phone numbers are
 * normalised separately by the payout-verification checksums module.
 */
export function normaliseIdentifier(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase()
}

/** Keyed HMAC-SHA256 blind index (hex) of a normalised value. */
export function blindIndex(value: string): string {
  return crypto
    .createHmac("sha256", blindIndexKey())
    .update(normaliseIdentifier(value))
    .digest("hex")
}

export function blindIndexOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? blindIndex(trimmed) : null
}

/** "••••1234" — last `keep` chars of the raw value behind bullets. */
export function maskTail(raw: string, keep = 4): string {
  const clean = raw.trim()
  if (clean.length <= keep) return "•".repeat(Math.max(clean.length, 4))
  return `${"•".repeat(4)}${clean.slice(-keep)}`
}
