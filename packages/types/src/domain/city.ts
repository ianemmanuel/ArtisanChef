import { BoundarySource, GeoStatus, ServiceAreaMode } from "../enums/geography"
import { Country } from "./country"
import {    
    BoundingBox, 
    DeliveryZone, 
    GeoJsonMultiPolygon, 
    GeoJsonPolygon, 
    ServiceArea 
} from "./geography"


export interface City {
    id : string
    countryId : string
    name : string
    code : string | null
    slug : string
    timezone : string
    latitude : number | null
    longitude : number | null
    osmId : string | null
    boundarySource : BoundarySource | null
    boundarySetAt : string | null
    boundingBox : BoundingBox | null
    status : GeoStatus
    createdByAdminId: string | null
    deactivatedByAdminId?: string | null
    deactivatedByName?    : string | null
    deactivatedAt?        : string | null
    deactivationReason?   : string | null
    outletCount?          : number
    _count? : { serviceAreas: number; deliveryZones: number }
    createdAt : string
    updatedAt : string
}

export interface CityDetail extends City {
    serviceAreas : ServiceArea[]
    deliveryZones: DeliveryZone[]
}

export interface OsmPreviewResult {
    osmId : string
    displayName: string
    boundary   : CityBoundary
    boundingBox: BoundingBox
    centroid   : { latitude: number; longitude: number }
}

export interface CityBoundaryData {
    cityId : string
    cityName : string
    centroid : { latitude: number | null; longitude: number | null }
    isConfigured  : boolean
    boundary : CityBoundary | null
    boundingBox : BoundingBox | null
    osmId : string | null
    boundarySource: BoundarySource | null
    boundarySetAt : string | null
}

export interface CityWithCountry extends City {
    country: Country
}

export type CityBoundary = GeoJsonPolygon | GeoJsonMultiPolygon

export interface ListCitiesParams {
    countryId? : string
    status?    : GeoStatus
}

export interface CreateCityRequest {
    countryId : string
    name      : string
    // code is system-generated from name + country (see admin.city.service.ts)
    timezone  : string
    latitude? : number
    longitude?: number
}

export interface UpdateCityRequest {
  name?: string
  status?: GeoStatus
  timezone?: string
  latitude?: number
  longitude?: number
}


export interface SaveCityBoundaryRequest {
  boundary  : CityBoundary
  osmId?    : string    // include if this originated from an OSM search
  source    : "OSM" | "MANUAL"
}

//* Vendors themselves are country-scoped (VendorAccount/VendorApplication
//* have no cityId) — Outlet is the city-scoped entity (a vendor's physical
//* storefront in a given city). City-level "vendor presence" metrics are
//* therefore outlet counts, not vendor account counts.
export interface CityOutletSnapshot {
  outlets: {
    total     : number
    active    : number
    suspended : number
    banned    : number
  }
  documentTypes: number
}

export interface CityOutletLeaderboardEntry {
  cityId: string
  name  : string
  slug  : string
  count : number
}

