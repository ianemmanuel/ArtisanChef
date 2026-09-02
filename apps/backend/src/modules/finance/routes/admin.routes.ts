import { Router } from "express"
import { AdminPermissions } from "@repo/types/enums"
import { requirePermission } from "@/modules/admin/middleware"
import {
  handleListPaymentProviders,
  handleGetPaymentProvider,
  handleCreatePaymentProvider,
  handleUpdatePaymentProvider,
  handleSetPaymentProviderStatus,
} from "../controllers/finance.provider.controller"
import {
  handleListCurrencies,
  handleGetCurrency,
  handleCreateCurrency,
  handleUpdateCurrency,
  handleSetCurrencyStatus,
} from "../controllers/finance.currency.controller"
import {
  handleGetCountryFinancialConfig,
  handleCreateCountryFinancialConfig,
  handleSetConfigCurrency,
  handleSetActiveProviderAccount,
  handleSetOperationalSwitches,
  handleActivateConfig,
  handleSuspendConfig,
  handleDisableConfig,
} from "../controllers/finance.countryConfig.controller"
import {
  handleListProviderAccounts,
  handleCreateProviderAccount,
  handleGetProviderAccount,
  handleUpdateProviderAccount,
  handleActivateProviderAccount,
  handleSuspendProviderAccount,
  handleDisableProviderAccount,
} from "../controllers/finance.providerAccount.controller"
import {
  handleListCountryPaymentMethods,
  handleSetPaymentMethodProviderAccount,
} from "../controllers/finance.paymentMethodProvider.controller"

/**
 * Finance module — admin-facing routes. Mounted at `/admin/v1/finance`
 * (behind the full adminAuthChain, by the admin v1 router).
 *
 * Phase 1A: Currency reference + PaymentProvider catalog.
 * Phase 1B: per-country CountryFinancialConfig + CountryProviderAccount.
 * Vendor payout account admin / payments / payouts are later phases.
 *
 * RBAC (no new mechanism — the existing pool + requirePermission + scope
 * model): READ = finance:configuration:read; every mutation =
 * finance:configuration:manage. Scope is enforced per-call in the
 * services: catalog/currency mutations + all lifecycle + structural
 * config changes require GLOBAL scope; DRAFT country-config editing is
 * allowed for a country-scoped admin on their own country;
 * city-scoped admins are refused country financial configuration.
 */
const financeAdminRouter: Router = Router()

const READ = requirePermission(AdminPermissions.FINANCE_CONFIGURATION_READ)
const MANAGE = requirePermission(AdminPermissions.FINANCE_CONFIGURATION_MANAGE)

//* ─── Payment-provider catalog ───────────────────────────────────────────
financeAdminRouter.get("/providers", READ, handleListPaymentProviders)
financeAdminRouter.post("/providers", MANAGE, handleCreatePaymentProvider)
financeAdminRouter.get("/providers/:idOrCode", READ, handleGetPaymentProvider)
financeAdminRouter.patch("/providers/:idOrCode", MANAGE, handleUpdatePaymentProvider)
financeAdminRouter.patch("/providers/:idOrCode/status", MANAGE, handleSetPaymentProviderStatus)

//* ─── Currency reference ─────────────────────────────────────────────────
financeAdminRouter.get("/currencies", READ, handleListCurrencies)
financeAdminRouter.post("/currencies", MANAGE, handleCreateCurrency)
financeAdminRouter.get("/currencies/:code", READ, handleGetCurrency)
financeAdminRouter.patch("/currencies/:code", MANAGE, handleUpdateCurrency)
financeAdminRouter.patch("/currencies/:code/status", MANAGE, handleSetCurrencyStatus)

//* ─── Per-country provider accounts ──────────────────────────────────────
financeAdminRouter.get("/countries/:countryRef/provider-accounts", READ, handleListProviderAccounts)
financeAdminRouter.post("/countries/:countryRef/provider-accounts", MANAGE, handleCreateProviderAccount)
financeAdminRouter.get("/provider-accounts/:accountId", READ, handleGetProviderAccount)
financeAdminRouter.patch("/provider-accounts/:accountId", MANAGE, handleUpdateProviderAccount)
financeAdminRouter.post("/provider-accounts/:accountId/activate", MANAGE, handleActivateProviderAccount)
financeAdminRouter.post("/provider-accounts/:accountId/suspend", MANAGE, handleSuspendProviderAccount)
financeAdminRouter.post("/provider-accounts/:accountId/disable", MANAGE, handleDisableProviderAccount)

//* ─── Per-country payment-method <-> provider-account wiring (Phase 1C) ───
financeAdminRouter.get("/countries/:countryRef/payment-methods", READ, handleListCountryPaymentMethods)
financeAdminRouter.patch(
  "/countries/:countryRef/payment-methods/:methodId/provider-account",
  MANAGE,
  handleSetPaymentMethodProviderAccount,
)

//* ─── Per-country financial configuration ────────────────────────────────
financeAdminRouter.get("/countries/:countryRef/financial-config", READ, handleGetCountryFinancialConfig)
financeAdminRouter.post("/countries/:countryRef/financial-config", MANAGE, handleCreateCountryFinancialConfig)
financeAdminRouter.patch("/countries/:countryRef/financial-config/currency", MANAGE, handleSetConfigCurrency)
financeAdminRouter.patch("/countries/:countryRef/financial-config/provider-account", MANAGE, handleSetActiveProviderAccount)
financeAdminRouter.patch("/countries/:countryRef/financial-config/switches", MANAGE, handleSetOperationalSwitches)
financeAdminRouter.post("/countries/:countryRef/financial-config/activate", MANAGE, handleActivateConfig)
financeAdminRouter.post("/countries/:countryRef/financial-config/suspend", MANAGE, handleSuspendConfig)
financeAdminRouter.post("/countries/:countryRef/financial-config/disable", MANAGE, handleDisableConfig)

export default financeAdminRouter
