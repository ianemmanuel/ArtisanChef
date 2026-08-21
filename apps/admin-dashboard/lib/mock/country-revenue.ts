// STATIC — replace once Orders/Payments ships.
//
// There is no Order/Payment/Revenue model in the schema yet, so the
// Countries analytics home and country detail page cannot pull real
// revenue numbers. Rather than fabricate a fake "live" data flow, this
// module generates a deterministic pseudo-random figure per country slug
// — deterministic so the numbers stay stable across renders/revalidations
// instead of jumping around on every page load, but otherwise entirely
// illustrative. Delete this file and wire real Orders/Payments data once
// that model exists.

function hashSlug(slug: string): number {
  let h = 0
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0
  }
  return h
}

export interface MockCountryRevenue {
  /** Illustrative "last quarter" revenue figure, in a single reporting currency (USD) for cross-country comparability. */
  revenue: number
  /** Illustrative quarter-over-quarter change, as a percentage (can be negative). */
  deltaPct: number
}

export function getMockCountryRevenue(slug: string): MockCountryRevenue {
  const h = hashSlug(slug)
  const revenue = 40_000 + (h % 440_000)
  const deltaPct = Math.round((((h >> 3) % 420) / 10 - 18) * 10) / 10
  return { revenue, deltaPct }
}

export function formatMockCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

export interface MockRevenuePoint {
  /** "2026-01" */
  month: string
  /** "Jan" */
  label: string
  value: number
}

/**
 * 12-month (or however many requested) revenue series for the
 * /countries/revenue page. `key` is either "all" (aggregate across every
 * active country in scope) or a single country slug. Deterministic per
 * key + calendar month, so the trend line is stable across
 * renders/revalidations but still illustrative-only — same caveat as
 * getMockCountryRevenue above.
 */
export function getMockRevenueSeries(key: string, months = 12): MockRevenuePoint[] {
  const h = hashSlug(key)
  const base = key === "all" ? 180_000 : 40_000 + (h % 440_000)
  const now = new Date()

  return Array.from({ length: months }, (_, i) => {
    const idx = months - 1 - i
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - idx, 1))
    const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    const seed = hashSlug(`${key}-${monthKey}`)
    // Gentle upward drift + seeded noise, clamped so it never goes negative.
    const drift = 1 + (i / months) * 0.35
    const noise = 0.75 + (seed % 500) / 1000
    const value = Math.round((base / months) * drift * noise / 100) * 100

    return {
      month: monthKey,
      label: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      value: Math.max(value, 0),
    }
  })
}
