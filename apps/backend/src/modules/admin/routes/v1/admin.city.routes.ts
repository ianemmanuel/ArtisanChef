
import { Router } from "express"
import { requirePermission } from "@/modules/admin/middleware"
import { AdminPermissions } from "@repo/types/enums"
import {
    handleActivateCity,
    handleCreateCity,
    handleDeactivateCity,
    handleGetCity,
    handleUpdateCity,
    handleGetCityOutletSnapshot,
} from "../../controllers/admin.city.controller"
import { 
    handleClearCityBoundary,   
    handleGetCityBoundary, 
    handlePreviewOsmBoundary, 
    handleSaveCityBoundary 
} from "../../controllers/admin.city.controller"
import { handleListServiceAreas, handleCreateServiceArea, } from "../../controllers/admin.servicearea.controller"
import { handleListDeliveryZones, handleCreateDeliveryZone } from "../../controllers/admin.deliveryzone.controller"
import { handleListZones, handleCreateZone } from "../../controllers/admin.zone.controller"
import {
    handleGetMarketSignalSummary,
    handleListMarketSignals,
    handleRecordMarketSignal,
} from "../../controllers/admin.marketSignal.controller"

const cityRouter: Router = Router()

const READ   = requirePermission(AdminPermissions.SETTINGS_GEOGRAPHY_READ)
const WRITE  = requirePermission(AdminPermissions.SETTINGS_GEOGRAPHY_WRITE)
const GLOBAL = requirePermission(AdminPermissions.SETTINGS_GEOGRAPHY_READ)

const ZONES_READ  = requirePermission(AdminPermissions.SETTINGS_ZONES_READ)
const ZONES_WRITE = requirePermission(AdminPermissions.SETTINGS_ZONES_WRITE)


cityRouter.get("/:cityRef", READ, handleGetCity)
cityRouter.get("/:cityRef/outlets-snapshot", READ, handleGetCityOutletSnapshot)
cityRouter.patch("/:cityRef", WRITE, handleUpdateCity)
cityRouter.patch("/:cityRef/activate", WRITE, handleActivateCity)
cityRouter.patch("/:cityRef/deactivate",WRITE, handleDeactivateCity)
cityRouter.get("/:cityRef/boundary", READ, handleGetCityBoundary)
cityRouter.post("/:cityRef/boundary", WRITE, handleSaveCityBoundary)
cityRouter.delete("/:cityRef/boundary", WRITE, handleClearCityBoundary)

// OSM preview — read-only, no DB write
cityRouter.get("/:cityRef/boundary/osm-preview", READ,  handlePreviewOsmBoundary)

cityRouter.get("/:cityRef/service-areas", READ, handleListServiceAreas)
cityRouter.post("/:cityRef/service-areas", WRITE, handleCreateServiceArea)
cityRouter.get("/:cityRef/delivery-zones", READ, handleListDeliveryZones)
cityRouter.post("/:cityRef/delivery-zones", WRITE, handleCreateDeliveryZone)

// Operational zones — gated on settings:zones:* (city-scoped-friendly),
// not settings:geography:* (see admin.zone.service.ts / the review doc).
cityRouter.get("/:cityRef/zones", ZONES_READ, handleListZones)
cityRouter.post("/:cityRef/zones", ZONES_WRITE, handleCreateZone)

// Market signals (supply/demand ahead of operating) — same gating as zones.
cityRouter.get("/:cityRef/market-signals/summary", ZONES_READ, handleGetMarketSignalSummary)
cityRouter.get("/:cityRef/market-signals", ZONES_READ, handleListMarketSignals)
cityRouter.post("/:cityRef/market-signals", ZONES_WRITE, handleRecordMarketSignal)

export default cityRouter