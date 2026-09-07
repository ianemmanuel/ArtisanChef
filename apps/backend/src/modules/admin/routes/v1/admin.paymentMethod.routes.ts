import { Router } from "express"
import { AdminPermissions } from "@repo/types/enums"
import { requirePermission } from "@/modules/admin/middleware"
import {
  handleListPaymentMethods,
  handleGetPaymentMethod,
  handleCreatePaymentMethod,
  handleUpdatePaymentMethod,
  handleSetPaymentMethodActive,
  handleListCountryPaymentMethods,
  handleConfigureCountryPaymentMethod,
  handleUpdateCountryPaymentMethod,
  handleSetCountryPaymentMethodStatus,
} from "../../controllers/admin.paymentMethod.controller"

/**
 * Payment gateway catalog + per-country configuration. Mounted at:
 * /admin/v1/payment-methods
 *
 * READ is permission-gated only (global catalog reads need no scope check;
 * per-country reads are scope-filtered in the service). Every mutation
 * additionally requires GLOBAL scope (assertGlobalScope in the service) —
 * see admin.paymentMethod.service.ts's file-level comment for why.
 */
const router: Router = Router()

const READ   = requirePermission(AdminPermissions.FINANCE_PAYMENT_METHODS_READ)
const MANAGE = requirePermission(AdminPermissions.FINANCE_PAYMENT_METHODS_MANAGE)

router.get("/",          READ, handleListPaymentMethods)
router.post("/",         MANAGE, handleCreatePaymentMethod)
router.get("/:idOrCode", READ, handleGetPaymentMethod)
router.patch("/:idOrCode", MANAGE, handleUpdatePaymentMethod)
router.patch("/:idOrCode/active", MANAGE, handleSetPaymentMethodActive)

router.get("/countries/:countryIdOrSlug", READ, handleListCountryPaymentMethods)
router.post("/country-config", MANAGE, handleConfigureCountryPaymentMethod)
router.patch("/country-config/:id", MANAGE, handleUpdateCountryPaymentMethod)
router.patch("/country-config/:id/status", MANAGE, handleSetCountryPaymentMethodStatus)

export default router
