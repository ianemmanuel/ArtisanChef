
import { GeoStatus } from "../enums/geography"
import { City } from "./city"

export interface Country {
  id : string
  name : string
  code : string
  slug : string
  currency : string
  currencySymbol : string | null
  phoneCode : string
  timezones : string[]
  cities : City[]
  status : GeoStatus
  region?: { id: string; name: string; code: string } | null
  readyForVendorOnboarding   : boolean
  vendorOnboardingReadyAt    : string | null
  readyForCustomerOperations : boolean
  customerOperationsReadyAt  : string | null
  checklist? : {
    vendorTypeCount: number; documentTypeCount: number
    outboundPaymentMethodCount: number; inboundPaymentMethodCount: number
    readyToActivate: boolean
  }
  _count? : { cities: number; vendors: number }
  createdByAdminId: string | null
  createdAt : string
  updatedAt : string
}


export interface UpdateCountryRequest {
  status? : GeoStatus
  currencySymbol?: string
  timezones? : string[]
}

export interface CountrySummaryResult {
  id: string
  name: string
  slug: string
  code: string
  currency: string
  phoneCode: string
  status: string
  createdAt: Date
  region?: {
    id: string
    name: string
    code: string
  } | null
  readyForVendorOnboarding  : boolean
  readyForCustomerOperations: boolean
  _count: {
    cities:        number
    vendors:       number
    vendorTypes:   number
    documentTypes: number
  }
}

export interface CountryListResult {
  countries : CountrySummaryResult[]
  total     : number
  page      : number
  pageSize  : number
  totalPages: number
}

export interface CreateCountryRequest {
  name : string
  code : string
  currency : string
  currencySymbol?: string
  phoneCode : string
  timezones : string[]
}


export interface CountryWithCities extends Country {
  cities: City[]
}

export interface CountryVendorSnapshot {
  applications: {
    total:       number
    draft:       number
    submitted:   number
    underReview: number
    approved:    number
    rejected:    number
  }
  accounts: {
    total:     number
    active:    number
    suspended: number
    banned:    number
  }
  vendorTypes: Array<{
    name:  string
    count: number
  }>
}

//* Ranks active countries within scope by vendor applications submitted in
//* a given quarter — powers the /countries insights leaderboard. Always
//* returns every in-scope active country (ranked), so the frontend can
//* either slice to a top-5 or show all when there are fewer than 5.
export interface CountryOnboardingLeaderboardEntry {
  countryId: string
  name:      string
  slug:      string
  count:     number
}