import type { ContentModerationProvider } from "./types"
import { badWordsProvider } from "./bad-words.provider"

export type {
  ContentModerationProvider,
  ModerationFlag,
  ModerationReason,
  ModerationInput,
  ModerationResult,
} from "./types"
export { checkImpersonation } from "./impersonation"

/*
 * The single place a moderation engine is chosen. Today there's exactly one
 * (bad-words). When a real provider is added, switch on an env var here —
 * every call site already goes through this function.
 */
export function getModerationProvider(): ContentModerationProvider {
  return badWordsProvider
}
