import { prisma, PaymentMethodType, PaymentDirection, CountryPaymentMethodStatus } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { ApiError } from "@/errors/ApiError"
import { UUID_RE } from "@/constants/system"
import { logger } from "@/lib/pino/logger"
import { auditService } from "@/services/audit"

const serviceLog = logger.child({ module: "admin-payment-method-service" })

/*
 * Roadmap "Payment gateway infrastructure" (CLAUDE.md, 2026-08-26) — the
 * global PaymentMethod catalog + per-country CountryPaymentMethod config
 * that governs both customer payment collection (INBOUND) and vendor
 * payout (OUTBOUND) rails. Both models already existed, fully designed,
 * in the schema — this is the first admin management surface for either.
 *
 * Governance is deliberately global-scope-only for every mutation here
 * (catalog AND per-country config), per explicit product direction: only
 * super_admin, operations_admin, and finance may hold
 * FINANCE_PAYMENT_METHODS_MANAGE, and every write additionally requires
 * GLOBAL scope — a country-scoped finance admin can read their own
 * country's config but cannot change it. This is why `finance`'s
 * ROLE_SCOPE_RULES gained GLOBAL as an available (not default) scope
 * option (scope-rules.ts) — without it, no finance-role admin could ever
 * pass this gate.
 */

function assertGlobalScope(scope: AdminScopeContext): void {
  if (!scope.isGlobal) {
    throw new ApiError(403, "Payment gateway management requires global scope", "SCOPE_FORBIDDEN")
  }
}

function assertCountryInScope(countryId: string, scope: AdminScopeContext): void {
  if (!scope.isGlobal && !scope.countryIds.includes(countryId)) {
    throw new ApiError(403, "This country is outside your scope", "SCOPE_FORBIDDEN")
  }
}

async function resolvePaymentMethodId(idOrCode: string): Promise<string> {
  const isUuid = UUID_RE.test(idOrCode)
  const method = await prisma.paymentMethod.findFirst({
    where : isUuid ? { id: idOrCode } : { code: idOrCode.toUpperCase() },
    select: { id: true },
  })
  if (!method) throw new ApiError(404, "Payment method not found", "NOT_FOUND")
  return method.id
}

async function resolveCountryId(idOrSlug: string): Promise<string> {
  const isUuid = UUID_RE.test(idOrSlug)
  const country = await prisma.country.findFirst({
    where : isUuid ? { id: idOrSlug } : { slug: idOrSlug },
    select: { id: true },
  })
  if (!country) throw new ApiError(404, "Country not found", "NOT_FOUND")
  return country.id
}

//* ─── Global catalog ─────────────────────────────────────────────────────

export interface ListPaymentMethodsParams {
  search?  : string
  isActive?: boolean
  page?    : number
  pageSize?: number
}

export async function listPaymentMethods(params: ListPaymentMethodsParams = {}) {
  const { search, isActive, page = 1, pageSize = 20 } = params
  const skip = (page - 1) * pageSize
  const where = {
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
  }

  const [methods, total] = await Promise.all([
    prisma.paymentMethod.findMany({
      where, skip, take: pageSize,
      orderBy: { name: "asc" },
      include: { _count: { select: { countryConfigs: true } } },
    }),
    prisma.paymentMethod.count({ where }),
  ])

  return {
    methods: methods.map((m) => {
      const { _count, ...rest } = m
      return { ...rest, countryConfigCount: _count.countryConfigs }
    }),
    total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export async function getPaymentMethod(idOrCode: string) {
  const id = await resolvePaymentMethodId(idOrCode)
  const method = await prisma.paymentMethod.findUnique({
    where  : { id },
    include: { countryConfigs: { orderBy: [{ direction: "asc" }, { displayOrder: "asc" }] } },
  })
  if (!method) throw new ApiError(404, "Payment method not found", "NOT_FOUND")

  // CountryPaymentMethod.countryId is a plain scalar FK, not a Prisma
  // relation (same convention as Outlet.cityId elsewhere in this schema)
  // — batch-fetch country names/slugs instead of an `include`.
  const countryIds = [...new Set(method.countryConfigs.map((c) => c.countryId))]
  const countries = countryIds.length
    ? await prisma.country.findMany({ where: { id: { in: countryIds } }, select: { id: true, name: true, slug: true } })
    : []
  const countryById = new Map(countries.map((c) => [c.id, c]))

  return {
    ...method,
    countryConfigs: method.countryConfigs.map((c) => ({ ...c, country: countryById.get(c.countryId) ?? null })),
  }
}

export interface CreatePaymentMethodInput {
  code       : string
  name       : string
  type       : PaymentMethodType
  direction  : PaymentDirection[]
  logoUrl?   : string
  description?: string
}

export async function createPaymentMethod(input: CreatePaymentMethodInput, actorId: string, scope: AdminScopeContext) {
  assertGlobalScope(scope)
  if (!input.code.trim() || !input.name.trim()) throw new ApiError(400, "code and name are required", "MISSING_FIELDS")
  if (input.direction.length === 0) throw new ApiError(400, "At least one direction (INBOUND/OUTBOUND) is required", "MISSING_DIRECTION")

  const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_")
  const existing = await prisma.paymentMethod.findUnique({ where: { code } })
  if (existing) throw new ApiError(409, `A payment method with code "${code}" already exists`, "DUPLICATE_CODE")

  const method = await prisma.paymentMethod.create({
    data: {
      code, name: input.name.trim(), type: input.type, direction: input.direction,
      logoUrl: input.logoUrl || null, description: input.description || null,
      createdByAdminId: actorId,
    },
  })

  serviceLog.info({ paymentMethodId: method.id, code, actorId }, "Payment method created")
  auditService.log({
    adminUserId: actorId,
    action     : "payment_method.created",
    entityType : "PaymentMethod",
    entityId   : method.id,
    changes    : { after: { code, name: method.name, type: method.type, direction: method.direction } },
  })

  return method
}

export interface UpdatePaymentMethodInput {
  name?       : string
  type?       : PaymentMethodType
  direction?  : PaymentDirection[]
  logoUrl?    : string
  description?: string
}

export async function updatePaymentMethod(idOrCode: string, input: UpdatePaymentMethodInput, actorId: string, scope: AdminScopeContext) {
  assertGlobalScope(scope)
  const id = await resolvePaymentMethodId(idOrCode)
  const existing = await prisma.paymentMethod.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, "Payment method not found", "NOT_FOUND")
  if (input.direction && input.direction.length === 0) throw new ApiError(400, "At least one direction (INBOUND/OUTBOUND) is required", "MISSING_DIRECTION")

  const updated = await prisma.paymentMethod.update({
    where: { id },
    data : {
      ...(input.name != null ? { name: input.name.trim() } : {}),
      ...(input.type != null ? { type: input.type } : {}),
      ...(input.direction != null ? { direction: input.direction } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl || null } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
    },
  })

  serviceLog.info({ paymentMethodId: id, actorId }, "Payment method updated")
  auditService.log({
    adminUserId: actorId,
    action     : "payment_method.updated",
    entityType : "PaymentMethod",
    entityId   : id,
    changes    : { before: existing, after: updated },
  })

  return updated
}

/*
 * Deactivate/reactivate the global catalog entry — a hard delete would
 * orphan any CountryPaymentMethod rows still referencing it (no cascade
 * is configured, deliberately, since a payout/collection config
 * referencing a now-nonexistent method is a data-integrity trap). Setting
 * isActive: false is enough for it to stop being offerable anywhere new;
 * existing CountryPaymentMethod rows are untouched and remain an explicit,
 * separate deactivation (see setCountryPaymentMethodStatus) — a global
 * catalog change shouldn't silently cascade into every country's config.
 */
export async function setPaymentMethodActive(idOrCode: string, isActive: boolean, actorId: string, scope: AdminScopeContext) {
  assertGlobalScope(scope)
  const id = await resolvePaymentMethodId(idOrCode)
  const existing = await prisma.paymentMethod.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, "Payment method not found", "NOT_FOUND")
  if (existing.isActive === isActive) {
    throw new ApiError(400, `Payment method is already ${isActive ? "active" : "inactive"}`, "NO_CHANGE")
  }

  const updated = await prisma.paymentMethod.update({ where: { id }, data: { isActive } })

  serviceLog.info({ paymentMethodId: id, isActive, actorId }, "Payment method active status changed")
  auditService.log({
    adminUserId: actorId,
    action     : isActive ? "payment_method.reactivated" : "payment_method.deactivated",
    entityType : "PaymentMethod",
    entityId   : id,
    changes    : { before: { isActive: existing.isActive }, after: { isActive } },
  })

  return updated
}

//* ─── Per-country configuration ──────────────────────────────────────────

export async function listCountryPaymentMethods(countryIdOrSlug: string, scope: AdminScopeContext, direction?: PaymentDirection) {
  const countryId = await resolveCountryId(countryIdOrSlug)
  assertCountryInScope(countryId, scope)

  return prisma.countryPaymentMethod.findMany({
    where  : { countryId, ...(direction ? { direction } : {}) },
    include: {
      paymentMethod: { select: { id: true, code: true, name: true, type: true, logoUrl: true, isActive: true } },
      // Which provider account executes this method — wired on the country
      // Finance page. A method not wired to the country's ACTIVE account
      // doesn't count toward financial readiness.
      countryProviderAccount: {
        select: {
          id: true,
          environment: true,
          status: true,
          paymentProvider: { select: { code: true, name: true } },
        },
      },
    },
    orderBy: [{ direction: "asc" }, { displayOrder: "asc" }],
  })
}

export interface ConfigureCountryPaymentMethodInput {
  countryId       : string
  paymentMethodId : string
  direction       : PaymentDirection
  displayOrder?   : number
}

/*
 * Create-or-reactivate — same convention as assignVendorTypeToCountry: the
 * @@unique([countryId, paymentMethodId, direction]) constraint means a
 * prior DEPRECATED/INACTIVE row for this exact combination is reactivated
 * in place rather than duplicated.
 *
 * This is deliberately a THIN toggle. It records "this country offers this
 * method in this direction" and its display order — nothing else. The
 * provider that executes it is wired separately on the Finance page
 * (countryProviderAccountId); credentials/settlement/verification are
 * provider-owned (adapter + secrets manager), never entered here.
 */
export async function configureCountryPaymentMethod(input: ConfigureCountryPaymentMethodInput, actorId: string, scope: AdminScopeContext) {
  assertGlobalScope(scope)

  const [paymentMethod, country] = await Promise.all([
    prisma.paymentMethod.findUnique({ where: { id: input.paymentMethodId } }),
    prisma.country.findUnique({ where: { id: input.countryId } }),
  ])
  if (!paymentMethod) throw new ApiError(404, "Payment method not found", "NOT_FOUND")
  if (!paymentMethod.isActive) throw new ApiError(400, "Cannot configure an inactive payment method", "PAYMENT_METHOD_INACTIVE")
  if (!country) throw new ApiError(404, "Country not found", "NOT_FOUND")
  if (!paymentMethod.direction.includes(input.direction)) {
    throw new ApiError(400, `${paymentMethod.name} does not support ${input.direction} — check its supported directions`, "DIRECTION_NOT_SUPPORTED")
  }

  const existing = await prisma.countryPaymentMethod.findUnique({
    where: { countryId_paymentMethodId_direction: { countryId: input.countryId, paymentMethodId: input.paymentMethodId, direction: input.direction } },
  })

  if (existing) {
    const updated = await prisma.countryPaymentMethod.update({
      where: { id: existing.id },
      data : {
        status: CountryPaymentMethodStatus.ACTIVE,
        ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      },
    })
    serviceLog.info({ countryPaymentMethodId: existing.id, actorId }, "Country payment method reconfigured")
    auditService.log({
      adminUserId: actorId,
      action     : "country_payment_method.configured",
      entityType : "CountryPaymentMethod",
      entityId   : existing.id,
      changes    : { before: { status: existing.status }, after: { status: "ACTIVE" } },
      metadata   : { countryId: input.countryId, paymentMethodId: input.paymentMethodId, direction: input.direction },
    })
    return updated
  }

  const created = await prisma.countryPaymentMethod.create({
    data: {
      countryId: input.countryId,
      paymentMethodId: input.paymentMethodId,
      direction: input.direction,
      displayOrder: input.displayOrder ?? 0,
      createdByAdminId: actorId,
    },
  })

  serviceLog.info({ countryPaymentMethodId: created.id, actorId }, "Country payment method configured")
  auditService.log({
    adminUserId: actorId,
    action     : "country_payment_method.configured",
    entityType : "CountryPaymentMethod",
    entityId   : created.id,
    changes    : { after: { countryId: input.countryId, paymentMethodId: input.paymentMethodId, direction: input.direction } },
  })

  return created
}

/**
 * Edit the mutable business config of an already-configured method — only
 * the display order. Method + direction are immutable (they're the unique
 * key and vendors' payout accounts reference a specific (method, direction)
 * row); to change direction, deactivate this row and configure the other
 * direction separately. Status has its own toggle; provider wiring lives on
 * the Finance page.
 */
export async function updateCountryPaymentMethod(
  id: string,
  input: { displayOrder?: number },
  actorId: string,
  scope: AdminScopeContext,
) {
  assertGlobalScope(scope)
  const existing = await prisma.countryPaymentMethod.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, "Country payment method not found", "NOT_FOUND")

  const updated = await prisma.countryPaymentMethod.update({
    where: { id },
    data: { ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}) },
  })

  serviceLog.info({ countryPaymentMethodId: id, actorId }, "Country payment method updated")
  auditService.log({
    adminUserId: actorId,
    action     : "country_payment_method.updated",
    entityType : "CountryPaymentMethod",
    entityId   : id,
    changes    : { before: { displayOrder: existing.displayOrder }, after: { displayOrder: updated.displayOrder } },
    metadata   : { countryId: existing.countryId },
  })

  return updated
}

export async function setCountryPaymentMethodStatus(
  id     : string,
  status : "ACTIVE" | "INACTIVE" | "DEPRECATED",
  actorId: string,
  scope  : AdminScopeContext,
) {
  assertGlobalScope(scope)
  const existing = await prisma.countryPaymentMethod.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, "Country payment method not found", "NOT_FOUND")
  if (existing.status === status) throw new ApiError(400, `Already ${status}`, "NO_CHANGE")

  const updated = await prisma.countryPaymentMethod.update({ where: { id }, data: { status } })

  serviceLog.info({ countryPaymentMethodId: id, status, actorId }, "Country payment method status changed")
  auditService.log({
    adminUserId: actorId,
    action     : "country_payment_method.status_changed",
    entityType : "CountryPaymentMethod",
    entityId   : id,
    changes    : { before: { status: existing.status }, after: { status } },
  })

  return updated
}
