import { prisma } from "@repo/db"
import type { AdminScopeContext } from "@repo/types/backend"
import { getManageableAdminUserIds } from "./admin.user.service"
import { toCsv } from "@/lib/csv"

// Roadmap VM-P2-01 (CLAUDE.md) — CSV export safety cap. An audit trail can
// grow indefinitely; a regulator hand-off wants "everything matching these
// filters," not literally unbounded rows in one response. Narrow the date
// range if a deployment ever needs more than this in one export.
const MAX_AUDIT_EXPORT_ROWS = 5000

interface ListAuditLogsFilters {
  action?  : string
  search?  : string
  dateFrom?: Date
  dateTo?  : Date
  page?    : number
  pageSize?: number
}

/*
 * AuditLog has no relation to the admin it's about (entityId is a generic
 * string shared across every module's events) or a text index over names —
 * so "search" resolves to a set of matching AdminUser ids first, then
 * filters events where either the actor or the target is one of them.
 * An empty result here is intentional: searching for a name that matches
 * no admin should yield zero audit rows, not an unfiltered list.
 */
async function resolveSearchAdminIds(search: string): Promise<string[]> {
  const matches = await prisma.adminUser.findMany({
    where: {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName : { contains: search, mode: "insensitive" } },
        { email    : { contains: search, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  })
  return matches.map((m) => m.id)
}

/*
 * Read-only view of AuditLog, scoped to the identity module — this page
 * lives under Identity & Access, so it only surfaces admin-user-management
 * events (entityType "AdminUser": create/invite/suspend/reinstate/
 * deactivate/permissions/role/scopes/availability). AuditLog itself is a
 * generic, cross-module log; broader search stays a direct DB/export
 * concern, not this UI.
 *
 * Scoping mirrors listAdminUsers: a country-scoped actor only sees events
 * about admins they can actually manage. A full-access actor (super_admin,
 * or a globally-scoped identity_admin — see actorHasFullAccess in
 * admin.user.service.ts) sees everything.
 */
async function buildAuditLogsWhere(filters: Pick<ListAuditLogsFilters, "action" | "search" | "dateFrom" | "dateTo">, actorScope: AdminScopeContext) {
  const { action, search, dateFrom, dateTo } = filters
  const manageableIds = await getManageableAdminUserIds(actorScope)

  // entityId is used by both the scope filter (target must be manageable)
  // and search (target/actor name match) — kept as separate AND clauses
  // rather than merged into one `entityId` key, which Prisma would treat
  // as the last-write-wins instead of an intersection.
  const andClauses: any[] = []
  if (manageableIds) andClauses.push({ entityId: { in: manageableIds } })
  if (search?.trim()) {
    const searchIds = await resolveSearchAdminIds(search.trim())
    andClauses.push({ OR: [{ adminUserId: { in: searchIds } }, { entityId: { in: searchIds } }] })
  }

  const where: any = {
    entityType: "AdminUser",
    ...(action ? { action } : {}),
    ...((dateFrom || dateTo) ? {
      createdAt: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo   ? { lte: dateTo }   : {}),
      },
    } : {}),
    ...(andClauses.length ? { AND: andClauses } : {}),
  }
  return where
}

export async function listAuditLogs(filters: ListAuditLogsFilters, actorScope: AdminScopeContext) {
  const { page = 1, pageSize = 20 } = filters
  const skip = (page - 1) * pageSize

  const where = await buildAuditLogsWhere(filters, actorScope)

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take   : pageSize,
      orderBy: { createdAt: "desc" },
      include: { adminUser: { select: { id: true, firstName: true, lastName: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ])

  const targetIds = [...new Set(logs.map((l) => l.entityId).filter((id): id is string => !!id))]
  const targets = targetIds.length
    ? await prisma.adminUser.findMany({
        where : { id: { in: targetIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : []
  const targetById = new Map(targets.map((t) => [t.id, t]))

  return {
    logs: logs.map((l) => ({ ...l, target: l.entityId ? (targetById.get(l.entityId) ?? null) : null })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getAuditLog(id: string, actorScope: AdminScopeContext) {
  const manageableIds = await getManageableAdminUserIds(actorScope)

  const log = await prisma.auditLog.findFirst({
    where: {
      id,
      entityType: "AdminUser",
      ...(manageableIds ? { entityId: { in: manageableIds } } : {}),
    },
    include: { adminUser: { select: { id: true, firstName: true, lastName: true, email: true } } },
  })
  if (!log) return null

  const target = log.entityId
    ? await prisma.adminUser.findUnique({
        where : { id: log.entityId },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : null

  return { ...log, target }
}

/*
 * Roadmap VM-P2-01 (CLAUDE.md) — CSV export of the Identity & Access audit
 * trail for a regulator hand-off. Same filters + scope as listAuditLogs,
 * capped at MAX_AUDIT_EXPORT_ROWS instead of paginated.
 */
export async function exportAuditLogsCsv(filters: Omit<ListAuditLogsFilters, "page" | "pageSize">, actorScope: AdminScopeContext): Promise<string> {
  const where = await buildAuditLogsWhere(filters, actorScope)

  const logs = await prisma.auditLog.findMany({
    where,
    take   : MAX_AUDIT_EXPORT_ROWS,
    orderBy: { createdAt: "desc" },
    include: { adminUser: { select: { firstName: true, lastName: true, email: true } } },
  })

  const targetIds = [...new Set(logs.map((l) => l.entityId).filter((id): id is string => !!id))]
  const targets = targetIds.length
    ? await prisma.adminUser.findMany({ where: { id: { in: targetIds } }, select: { id: true, firstName: true, lastName: true, email: true } })
    : []
  const targetById = new Map(targets.map((t) => [t.id, t]))

  return toCsv(logs.map((l) => {
    const target = l.entityId ? targetById.get(l.entityId) : undefined
    return {
      createdAt: l.createdAt.toISOString(),
      action   : l.action,
      actor    : l.adminUser ? `${l.adminUser.firstName} ${l.adminUser.lastName} <${l.adminUser.email}>` : "System",
      target   : target ? `${target.firstName} ${target.lastName} <${target.email}>` : (l.entityId ?? ""),
      entityType: l.entityType,
      entityId  : l.entityId ?? "",
    }
  }), [
    { key: "createdAt",  label: "Timestamp" },
    { key: "action",     label: "Action" },
    { key: "actor",      label: "Actor" },
    { key: "target",     label: "Target" },
    { key: "entityType", label: "Entity Type" },
    { key: "entityId",   label: "Entity ID" },
  ])
}
