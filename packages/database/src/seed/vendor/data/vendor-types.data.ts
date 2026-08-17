/**
 * Canonical vendor type dataset — global definitions, not tied to any
 * country. Which countries a type is actually available in is an
 * ongoing admin decision (VendorTypeCountry), deliberately not seeded —
 * see seed/vendor/index.ts.
 */
export interface VendorTypeSeedRow {
  name: string
  description: string
}

export const VENDOR_TYPES: VendorTypeSeedRow[] = [
  { name: 'Restaurant', description: 'Full-service or quick-service restaurant preparing meals to order' },
  { name: 'Bakery', description: 'Bread, pastries, cakes, and baked goods' },
  { name: 'Cafe', description: 'Coffee, light bites, and casual seating-focused food service' },
  { name: 'Grocery', description: 'Packaged goods, fresh produce, and household staples' },
  { name: 'Cloud Kitchen', description: 'Delivery-only kitchen with no dine-in storefront' },
  { name: 'Catering', description: 'Bulk or event-based food preparation and delivery' },
]
