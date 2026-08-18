/*
 * FALLBACK ONLY — not the authoritative label.
 *
 * The backend's AdminActionReason model owns the real human-readable
 * label/description for a reasonCode (e.g. "INVALID_BUSINESS_REGISTRATION"
 * -> "Invalid Business Registration Document" + a full description), but
 * that CRUD is currently mounted only under /admin/v1/action-reasons,
 * behind the admin Clerk auth chain — there is no vendor-accessible
 * endpoint that resolves a reasonCode to its configured label. See the
 * implementation report's "Backend contract issues discovered" section.
 *
 * Until that's added, this just title-cases the machine code itself so
 * the vendor sees "Invalid business registration" instead of a raw
 * SCREAMING_SNAKE_CASE string — readable, but not the real configured
 * label/description an admin may have written.
 */
export function humanizeReasonCode(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((word, i) => (i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ")
}
