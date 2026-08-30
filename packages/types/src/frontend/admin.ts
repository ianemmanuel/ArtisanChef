//* src/frontend/admin.ts


//* ─── Admin dashboard type exports ────────────────────────────────────────────
// This is the ONLY file Next.js dashboard components should import from.
//? Usage: import type { AdminSessionData } from "@repo/types/admin-dashboard"
//! Never import from @repo/types/backend — that file depends on Express.

//* API

export type { 
    SessionRole, 
    AdminSessionData, 
    SessionScope, 
    SessionScopeContext 
} from "../domain/admin"

export type { 
    CountryKPIs, 
    KPITrend, 
    CityKPIs, 
    OutletKPIs, 
    VendorKPIs, 
    KPIResult
} from "../domain/kpi"

export type { RegionBreakdown, RegionSummaryResult } from "../domain/region"

//* Vendor applications — review workflow (Vendor Applications vertical slice)
export type {
    AdminActionReason,
    RejectApplicationRequest,
    MarkApplicationNeedsRevisionRequest,
    ApproveApplicationResponse,
} from "../domain/admin"

//* ENUMS
export type { AdminPermissionKey } from "../enums/admin"
export { AdminPermissions } from "../enums/admin"
export type { AdminRoleName } from "../enums/admin"
export { AdminRoleNames } from "../enums/admin"
export { AdminUserStatus } from "../enums/admin"
export { AdminScopeType } from "../enums/admin"
export { VendorApplicationStatus } from "../enums/vendor"
export { DocumentStatus } from "../enums/document"

export type { ServiceAreaMode } from "../enums/geography"
export type { GeoStatus } from "../enums/geography"
export type { OutletServiceMode } from "../enums/geography"
export type { BoundarySource } from "../enums/geography"
export type { ZoneLevel } from "../enums/geography"
export type { ZoneOperationalStatus } from "../enums/geography"

//* DOMAIN TYPES

//* Geography
export type {
    Country,
    CountrySummaryResult,
    CountryListResult,
    CountryWithCities,
    CountryVendorSnapshot,
    CountryOnboardingLeaderboardEntry,
    UpdateCountryRequest,
} from "../domain/country"

//* Vendor types
export type {
    VendorTypeSummary,
    VendorTypeListResult,
    VendorTypeStats,
    OutletGoLiveStatus,
    OutletClearanceStatus,
    OutletGoLiveBlocker,
    AdminOutletDocumentRow,
    OutletDocumentSeverity,
    VendorDocumentActionStatus,
    OutletInspectionPolicy,
    OutletInspectionStatus,
    OutletInspectionRow,
    AdminOutletInspectionRow,
    OutletInspectionListResult,
    OutletInspectionDetail,
    OutletMealPlanBlocker,
    OutletMealPlanReadiness,
} from "../domain/vendor"
export type { VendorTypeStatus } from "../enums/vendor"
export type {
    City,
    CityDetail,
    CityBoundaryData,
    CityBoundary,
    OsmPreviewResult,
    CreateCityRequest,
    UpdateCityRequest,
    CityOutletSnapshot,
    CityOutletLeaderboardEntry,
} from "../domain/city"

export type { ServiceArea } from "../domain/geography"
export type { DeliveryZone } from "../domain/geography"
export type { Zone } from "../domain/geography"
export type { ZoneListItem } from "../domain/geography"
export type { ZoneBoundary } from "../domain/geography"
export type { ZoneCapabilityFlags } from "../domain/geography"
export type { ResolvedCapabilities } from "../domain/geography"
export type { CreateZoneRequest } from "../domain/geography"
export type { UpdateZoneRequest } from "../domain/geography"
export type { SetZoneLevelRequest } from "../domain/geography"
export type { SetZoneOperationalStatusRequest } from "../domain/geography"
export type { MarketSignalType, MarketSignalStatus } from "../enums/geography"
export type {
  MarketSignal, MarketSignalBucket, MarketSignalZoneRow,
  CityMarketSignalSummary, MarketSignalListResult,
  CreateMarketSignalRequest, UpdateMarketSignalStatusRequest,
} from "../domain/geography"

export type { ServiceAreaBoundary } from "../domain/geography"
export type { DeliveryZoneBoundary } from "../domain/geography" 
export type { BoundingBox } from "../domain/geography"
export type { GeoPoint } from "../domain/geography"

export type { ApiSuccess, ApiErrorResponse } from "../shared/common"