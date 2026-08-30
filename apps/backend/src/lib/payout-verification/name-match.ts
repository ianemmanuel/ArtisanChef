import { levenshtein } from "@/lib/text/levenshtein"

/*
 * Fuzzy match between the name a vendor typed on a payout account
 * ("account holder name") and the name we already hold for them (legal
 * business name, or owner first+last). A low score is an advisory signal —
 * "a human should glance at this" — never an automatic rejection. Real
 * bank-account name verification is a provider/API job (deferred).
 */

function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\b(ltd|limited|inc|llc|plc|company|co|enterprises?|holdings?|group|the|and)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ") // also drops combining diacritics left by NFKD
    .trim()
}

function tokenSet(s: string): Set<string> {
  return new Set(normalise(s).split(" ").filter(Boolean))
}

/** Jaccard overlap of word sets, 0..1. */
function tokenOverlap(a: string, b: string): number {
  const sa = tokenSet(a)
  const sb = tokenSet(b)
  if (sa.size === 0 || sb.size === 0) return 0
  let shared = 0
  for (const t of sa) if (sb.has(t)) shared++
  return shared / new Set([...sa, ...sb]).size
}

/** Normalised edit-distance similarity of the whole strings, 0..1. */
function editSimilarity(a: string, b: string): number {
  const na = normalise(a).replace(/\s+/g, "")
  const nb = normalise(b).replace(/\s+/g, "")
  if (!na || !nb) return 0
  const dist = levenshtein(na, nb)
  return 1 - dist / Math.max(na.length, nb.length)
}

/**
 * Best similarity of `holderName` against any of the `candidates`
 * (legal name, "First Last", …). Returns 0..1, or null if there's nothing
 * to compare against.
 */
export function bestNameMatch(holderName: string | null | undefined, candidates: (string | null | undefined)[]): number | null {
  const holder = holderName?.trim()
  const list = candidates.map((c) => c?.trim()).filter((c): c is string => !!c)
  if (!holder || list.length === 0) return null

  let best = 0
  for (const c of list) {
    const edit = editSimilarity(holder, c)
    // Two arbitrary same-length names land ~0.3–0.45 on edit distance by
    // chance; only trust a high edit score (a genuine typo) at full weight.
    best = Math.max(best, tokenOverlap(holder, c), edit >= 0.8 ? edit : edit * 0.7)
  }
  return Math.round(best * 100) / 100
}
