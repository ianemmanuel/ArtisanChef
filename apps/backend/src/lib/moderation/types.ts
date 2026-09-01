/*
 * Content-moderation provider contract. The point of the interface is that
 * the profile/outlet flagging call sites depend on THIS, never on `bad-words`
 * directly — so a paid classifier (Perspective API, OpenAI moderation, an
 * in-house model, …) can be dropped in later by adding one provider file and
 * flipping getModerationProvider(), with zero change to the services that
 * call it. No such provider exists today; bad-words is the only impl.
 */

/** One thing the checks objected to. `field` is the input key; `match` is
 *  the specific offending token/phrase/brand when the provider can surface it. */
export interface ModerationFlag {
  field  : string
  reason : ModerationReason
  match? : string
}

export type ModerationReason =
  | "INAPPROPRIATE_CONTENT"   // profanity / slur / obscenity
  | "POSSIBLE_IMPERSONATION"  // display name is confusingly close to a known brand
  | "DUPLICATE_DISPLAY_NAME"  // exact same public name as another vendor in-country

/** Free-text fields to screen, keyed by a stable field name. Nullish values
 *  are skipped. */
export type ModerationInput = Record<string, string | null | undefined>

export interface ModerationResult {
  flags: ModerationFlag[]
}

export interface ContentModerationProvider {
  /** Stable identifier, surfaced in logs/audit so it's clear which engine ran. */
  readonly name: string
  /** Screen a set of text fields for inappropriate content. Impersonation and
   *  duplicate-name are separate, structured checks (see impersonation.ts) —
   *  a text-classifier provider has no way to know about either. */
  screenText(input: ModerationInput): Promise<ModerationFlag[]>
}
