/**
 * Canonical vendor type dataset — global definitions, not tied to any
 * country. Which countries a type is actually available in is an
 * ongoing admin decision (VendorTypeCountry), deliberately not seeded —
 * see seed/vendor/index.ts.
 */
export interface VendorTypeSeedRow {
  name: string
  slug: string
  description: string
}

export const VENDOR_TYPES: VendorTypeSeedRow[] = [
  { name: 'Restaurant', slug: 'restaurant', description: 'Full-service or quick-service restaurant preparing meals to order' },
  { name: 'Bakery', slug: 'bakery', description: 'Bread, pastries, cakes, and baked goods' },
  { name: 'Cafe', slug: 'cafe', description: 'Coffee, light bites, and casual seating-focused food service' },
  { name: 'Grocery', slug: 'grocery', description: 'Packaged goods, fresh produce, and household staples' },
  { name: 'Cloud Kitchen', slug: 'cloud-kitchen', description: 'Delivery-only kitchen with no dine-in storefront' },
  { name: 'Catering', slug: 'catering', description: 'Bulk or event-based food preparation and delivery' },
]
