import type { ModerationFlag } from "./types"
import { levenshtein } from "@/lib/text/levenshtein"

/*
 * Fuzzy brand-impersonation check for a vendor's public display name.
 *
 * A vendor calling itself "MacDonalds" or "K F C Nairobi" is the impersonation
 * risk the exact-match duplicate check can't see. We normalise aggressively
 * (case, punctuation, spacing, common leetspeak) then compare against a small
 * curated list of well-known food brands by:
 *   • exact normalised equality
 *   • one string containing the other (>= 4 normalised chars, to avoid "co")
 *   • Levenshtein distance <= EDIT_TOLERANCE on the normalised forms
 *
 * Deliberately a curated constant, not a model or an admin-managed table:
 * the real targets are a couple dozen global chains, the list changes rarely,
 * and a per-country / admin-CRUD brand registry is a clean follow-up once
 * there's a concrete need for market-specific brands (noted, not built).
 */

const KNOWN_BRANDS = [
  "McDonald's", "KFC", "Burger King", "Subway", "Starbucks", "Domino's Pizza",
  "Pizza Hut", "Taco Bell", "Wendy's", "Dunkin'", "Chipotle", "Popeyes",
  "Chick-fil-A", "Five Guys", "Nando's", "Papa John's", "Little Caesars",
  "Krispy Kreme", "Baskin-Robbins", "Costa Coffee", "Tim Hortons",
  "Shake Shack", "Carl's Jr", "Hardee's", "Jollibee", "Cinnabon",
  "Auntie Anne's", "Panda Express", "IHOP", "Denny's", "Olive Garden",
  "TGI Fridays", "Applebee's", "Wimpy", "Debonairs Pizza", "Steers",
  "Chicken Licken", "Galito's", "Java House", "Cold Stone Creamery",
] as const

const EDIT_TOLERANCE = 2
// Substring match only kicks in for brand names >= 5 normalised chars, so a
// vendor legitimately using a short common word ("Java", "Steak") isn't
// flagged just for appearing inside a longer brand ("Java House").
const MIN_CONTAIN_LEN = 5

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[àáâãä]/g, "a").replace(/[èéêë]/g, "e").replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o").replace(/[ùúûü]/g, "u")
    .replace(/[@4]/g, "a").replace(/[€3]/g, "e").replace(/[1!|]/g, "i")
    .replace(/[0]/g, "o").replace(/[5$]/g, "s").replace(/[7]/g, "t")
    .replace(/[^a-z0-9]/g, "")
}

const NORMALISED_BRANDS = KNOWN_BRANDS.map((b) => ({ label: b, norm: normalise(b) }))

/** Returns a POSSIBLE_IMPERSONATION flag if `displayName` looks like a known
 *  brand, else null. `field` is always "displayName". */
export function checkImpersonation(displayName: string): ModerationFlag | null {
  const name = normalise(displayName)
  if (name.length < 3) return null

  for (const brand of NORMALISED_BRANDS) {
    if (name === brand.norm) {
      return { field: "displayName", reason: "POSSIBLE_IMPERSONATION", match: brand.label }
    }
    const longEnough = brand.norm.length >= MIN_CONTAIN_LEN
    if (longEnough && (name.includes(brand.norm) || brand.norm.includes(name))) {
      return { field: "displayName", reason: "POSSIBLE_IMPERSONATION", match: brand.label }
    }
    // Scale tolerance down for very short brand names so "kfc" doesn't match
    // every 3-letter word.
    const tol = brand.norm.length <= 4 ? 1 : EDIT_TOLERANCE
    if (Math.abs(name.length - brand.norm.length) <= tol && levenshtein(name, brand.norm) <= tol) {
      return { field: "displayName", reason: "POSSIBLE_IMPERSONATION", match: brand.label }
    }
  }
  return null
}
