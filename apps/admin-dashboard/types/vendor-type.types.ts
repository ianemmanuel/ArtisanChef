// Mirrors backend VendorType / VendorTypeCountry shapes
// (apps/backend/src/modules/admin/services/admin.vendorType.service.ts).
// VendorTypeStatus is deliberately its own enum — ACTIVE/SUSPENDED, not the
// ACTIVE/INACTIVE GeoStatus used by Country/City — don't merge these.

export type VendorTypeStatus = "ACTIVE" | "SUSPENDED"

export interface VendorType {
  id: string
  name: string
  description: string | null
  status: VendorTypeStatus
  createdAt: string
  _count: { countries: number }
}

export interface CountryLite {
  id: string
  name: string
  code: string
  slug: string
}

export interface VendorTypeCountryLink {
  id: string
  countryId: string
  vendorTypeId: string
  status: string
  createdAt: string
  country: CountryLite
}

export interface VendorTypeDetail extends VendorType {
  countries: VendorTypeCountryLink[]
}

// Mirrors GET /admin/v1/vendor-types — now paginated/scope-aware
// (apps/backend/src/modules/admin/services/admin.vendorType.service.ts#listVendorTypes).
export interface VendorTypeListResult {
  vendorTypes: VendorType[]
  total      : number
  page       : number
  pageSize   : number
  totalPages : number
}

// Mirrors GET /admin/v1/vendor-types/:vendorTypeId/stats — real vendor-account
// counts, scope-filtered. No revenue here; revenue stays mock, see
// lib/mock/vendor-type-revenue.ts.
export interface VendorTypeStats {
  total    : number
  active   : number
  suspended: number
}

// Mirrors the { countries, total, ... } envelope GET /admin/v1/countries now
// returns (breaking change from the old bare CountrySummaryResult[]).
export interface CountryListLite {
  countries: CountryLite[]
}
