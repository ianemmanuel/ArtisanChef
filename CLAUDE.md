# DailyBread — Admin Platform

Turborepo monorepo for a multi-country food delivery platform's admin/ops tooling.

## Layout

- `apps/admin-dashboard` — Next.js (App Router) admin UI, Clerk auth
- `apps/backend` — Express API
- `packages/database` — Prisma schema + seed scripts (`@repo/db`)
- `packages/types` — shared types/enums, split into `domain/`, `backend/`, `frontend/` (`@repo/types/backend`, `@repo/types/admin-app`, `@repo/types/enums`)
- `packages/ui` — shared component library (shadcn-style, `@repo/ui/components/*`)

Type-check: `pnpm run check-types` per app (backend writes to `reports/typecheck/backend.txt`; empty file = clean).

## Backend admin module (`apps/backend/src/modules/admin`)

Pattern: `routes/v1/*.routes.ts` → `controllers/*.controller.ts` → `services/*.service.ts`. Middleware chain on every admin route: `verifyAdminToken → loadAdminUser → checkIsActive → loadPermissions → buildScopeContext`, then per-router gates (`requirePermission(X)`, and for Identity & Access, `requireIdentityAccess` restricting to `super_admin`/`identity_admin` only).

**RBAC**: pool-based. `AdminRolePermission` = a role's permission ceiling; `AdminUserPermission` = individual grants (must be within the role's pool). Roles: `super_admin` (all permissions), `identity_admin`, `finance`, `vendor_ops`, `customer_care`, `courier_ops`. Seed data lives in `packages/database/src/seed/admin/data/` (`roles.data.ts`, `permissions.data.ts`, `role-permissions.data.ts`) — idempotent upserts, safe to re-run via `pnpm db:seed`.

**Geographic scope** (`AdminUserScope`): `GLOBAL` / `COUNTRY` / `CITY`. A `CITY` row also carries the parent `countryId`. `AdminScopeContext` (`isGlobal`, `countryIds`, `cityIds`) is built per-request and threaded through every service function for authorization — defense-in-depth beyond the route-level permission gate.

**Audit logging**: every mutation calls `auditService.log({ adminUserId, action, entityType, entityId, changes, metadata })`, writing to the append-only `AuditLog` table (archived after 90 days, deleted after 730). Action strings follow `entity.verb` (e.g. `country.activated`, `vendor_type_country.assigned`).

## Frontend admin-dashboard conventions

- Server components fetch via `adminFetch()` (`lib/api`), tagged for `revalidate`/`router.refresh()` invalidation.
- Mutations go through Next route handlers under `app/api/**` that proxy to the backend (never call the backend directly from client components).
- Shared UI: `TableFilterBar` (search/status/country/sort/date-range — extend it rather than building bespoke filter bars), `TablePagination`, `EmptyState`, `admin-card`/`icon-badge`/`badge-*` utility classes, `AlertDialog`-based confirm/action dialogs (see `CountryActions.tsx`, `VendorTypeCountryManager.tsx` for the canonical pattern).
- Sidebar nav (`utils/constants/nav-items.ts` + `SidebarNav.tsx`) supports per-item `requiredPermission`, `requiresGlobalTier`, `hideForCityTier` — links vanish rather than render-then-403.

## Recent work

**Identity & Access hardening + audit trail** (admin-management module): tightened the scope hierarchy so a country-scoped `identity_admin` only manages same-country admins while a globally-scoped `identity_admin` gets full access across all countries (temporary, until regional/multi-country identity admins exist); added universal self-action and super-admin-target lockouts (no admin, including `super_admin`, can suspend/deactivate/reinstate/change availability/permissions/role/scope on themselves or on any `super_admin`); deactivation now strips permission grants; added an admin "availability" (unavailable-with-reason/date-range) feature; added a scoped `/identity/audit` list+detail trail (search, action-type filter, date range, pagination); restricted the entire Identity & Access sidebar section (desktop + mobile) to holders of the relevant permissions; fixed `ScopeSelector`'s oversized footprint (was rendering a duplicate heading).

**Next up**: overhauling the Countries module (see conversation/plan) — a country-launch checklist (vendor types + document types required before activation), `readyForVendorOnboarding`/`readyForCustomerOperations` readiness flags, and a cleaned-up enterprise `/countries` frontend information architecture.
