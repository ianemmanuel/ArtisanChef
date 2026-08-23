
import { Router } from "express"
import { AdminPermissions } from "@repo/types/enums"
import { requirePermission } from "@/modules/admin/middleware"
import {
    handleActivateCountry,
    handleDeactivateCountry,
    handleGetCountry,
    handleListCities,
    handleGetCountriesByStatus,
    handleGetCountryVendorSnapshot,
    handleGetVendorOnboardingLeaderboard,
    handleGetCityOutletLeaderboard,
    handleAssignCountryToRegion,
    handleRemoveCountryFromRegion,
    handleSetReadyForVendors,
    handleSetNotReadyForVendors,
    handleSetReadyForCustomers,
    handleSetNotReadyForCustomers,
} from "../../controllers/admin.country.controller"
import { handleCreateCity } from "../../controllers/admin.city.controller"
import {
    handleListVendorTypesForCountry,
    handleAssignVendorTypeToCountry,
    handleRemoveVendorTypeFromCountry,
} from "../../controllers/admin.vendorType.controller"


const countryRouter: Router = Router()

const READ   = requirePermission(AdminPermissions.SETTINGS_GEOGRAPHY_READ)
const WRITE  = requirePermission(AdminPermissions.SETTINGS_GEOGRAPHY_WRITE)
// Activate/deactivate additionally require scope.isGlobal, enforced in
// admin.country.service.ts — this permission gate is WRITE, same as any
// other country mutation, not a separate tier.
const GLOBAL = requirePermission(AdminPermissions.SETTINGS_GEOGRAPHY_WRITE)


countryRouter.get("/", READ, handleGetCountriesByStatus)
// Registered before /:countryRef for readability — Express wouldn't
// actually confuse the two (this is two path segments), but grouping the
// fixed insights routes above the param routes keeps the file scannable.
countryRouter.get("/insights/onboarding", READ, handleGetVendorOnboardingLeaderboard)
countryRouter.get("/:countryRef", READ, handleGetCountry)
countryRouter.patch("/:countryRef/activate", GLOBAL, handleActivateCountry)
countryRouter.patch("/:countryRef/deactivate", GLOBAL, handleDeactivateCountry)
countryRouter.patch("/:countryRef/ready-for-vendors", GLOBAL, handleSetReadyForVendors)
countryRouter.patch("/:countryRef/not-ready-for-vendors", GLOBAL, handleSetNotReadyForVendors)
countryRouter.patch("/:countryRef/ready-for-customers", GLOBAL, handleSetReadyForCustomers)
countryRouter.patch("/:countryRef/not-ready-for-customers", GLOBAL, handleSetNotReadyForCustomers)
countryRouter.get ("/:countryRef/cities", READ, handleListCities)
countryRouter.get ("/:countryRef/cities/leaderboard", READ, handleGetCityOutletLeaderboard)
countryRouter.post ("/:countryRef/cities", WRITE, handleCreateCity)
countryRouter.get("/:countryRef/vendors", READ, handleGetCountryVendorSnapshot)
countryRouter.patch("/:countryRef/region",  WRITE, handleAssignCountryToRegion)
countryRouter.delete("/:countryRef/region", WRITE, handleRemoveCountryFromRegion)

// Vendor types available in this country (VendorTypeCountry) — :countryRef
// is UUID-or-slug, resolved in admin.vendorType.service.ts, same convention
// as every other :countryRef route on this router.
countryRouter.get("/:countryRef/vendor-types", READ, handleListVendorTypesForCountry)
countryRouter.post("/:countryRef/vendor-types", WRITE, handleAssignVendorTypeToCountry)
countryRouter.delete("/:countryRef/vendor-types/:vendorTypeId", WRITE, handleRemoveVendorTypeFromCountry)

export default countryRouter