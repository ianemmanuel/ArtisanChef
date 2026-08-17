
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
    handleAssignCountryToRegion,
    handleRemoveCountryFromRegion,
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
countryRouter.get("/:countryRef", READ, handleGetCountry)
countryRouter.patch("/:countryRef/activate", GLOBAL, handleActivateCountry)
countryRouter.patch("/:countryRef/deactivate", GLOBAL, handleDeactivateCountry)
countryRouter.get ("/:countryRef/cities", READ, handleListCities)
countryRouter.post ("/:countryRef/cities", WRITE, handleCreateCity)
countryRouter.get("/:countryRef/vendors", READ, handleGetCountryVendorSnapshot)
countryRouter.patch("/:countryRef/region",  WRITE, handleAssignCountryToRegion)
countryRouter.delete("/:countryRef/region", WRITE, handleRemoveCountryFromRegion)

// Vendor types available in this country (VendorTypeCountry) — :countryRef
// here is the literal country id, same convention as :countryRef/cities above.
countryRouter.get("/:countryRef/vendor-types", READ, handleListVendorTypesForCountry)
countryRouter.post("/:countryRef/vendor-types", WRITE, handleAssignVendorTypeToCountry)
countryRouter.delete("/:countryRef/vendor-types/:vendorTypeId", WRITE, handleRemoveVendorTypeFromCountry)

export default countryRouter