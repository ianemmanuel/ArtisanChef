// STATIC — replace once Orders/Payments ships. Same rationale and shape as
// lib/mock/country-revenue.ts, just seeded by vendor-type id instead of
// country slug, for the /vendors/vendor-types/[id]/revenue page.

import type { MockRevenuePoint } from "./country-revenue"

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0
  }
  return h
}

export interface MockVendorTypeRevenue {
  revenue : number
  deltaPct: number
}

export function getMockVendorTypeRevenue(vendorTypeId: string): MockVendorTypeRevenue {
  const h = hashId(vendorTypeId)
  const revenue = 15_000 + (h % 220_000)
  const deltaPct = Math.round((((h >> 3) % 420) / 10 - 18) * 10) / 10
  return { revenue, deltaPct }
}

export function getMockVendorTypeRevenueSeries(vendorTypeId: string, months = 12): MockRevenuePoint[] {
  const h = hashId(vendorTypeId)
  const base = 15_000 + (h % 220_000)
  const now = new Date()

  return Array.from({ length: months }, (_, i) => {
    const idx = months - 1 - i
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - idx, 1))
    const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    const seed = hashId(`${vendorTypeId}-${monthKey}`)
    const drift = 1 + (i / months) * 0.3
    const noise = 0.75 + (seed % 500) / 1000
    const value = Math.round((base / months) * drift * noise / 100) * 100

    return {
      month: monthKey,
      label: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      value: Math.max(value, 0),
    }
  })
}
