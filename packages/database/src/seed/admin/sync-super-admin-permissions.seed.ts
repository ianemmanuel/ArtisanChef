import { prisma } from '../../index'
import { ROLE_POOLS } from './data/role-permissions.data'

/**
 * Roadmap "make sure super_admin always has every permission" fix
 * (CLAUDE.md, Vendor Management — Completion Roadmap).
 *
 * Permissions are enforced from individual AdminUserPermission rows, not
 * the role pool (see loadPermissions.ts) — the pool is only a ceiling.
 * `create-super-admin.ts` grants "the pool as it existed at creation
 * time" and refuses to touch an already-active account; the in-app
 * permission editor (admin.user.service.ts's assertTargetNotSuperAdmin)
 * refuses to edit ANY super_admin's permissions, always, by design.
 *
 * Net effect without this: a super_admin created before a new permission
 * existed would never receive it through any existing path. This closes
 * that gap by granting every super_admin AdminUser any pool permission
 * they don't already individually hold. Idempotent — safe to re-run.
 */
export async function syncSuperAdminPermissions(): Promise<number> {
  const role = await prisma.adminRole.findUnique({ where: { name: 'super_admin' } })
  if (!role) return 0

  const poolKeys = ROLE_POOLS.super_admin ?? []
  if (poolKeys.length === 0) return 0

  const [permissions, superAdmins] = await Promise.all([
    prisma.adminPermission.findMany({ where: { key: { in: poolKeys } } }),
    prisma.adminUser.findMany({ where: { roleId: role.id }, select: { id: true } }),
  ])
  if (permissions.length === 0 || superAdmins.length === 0) return 0

  const existingGrants = await prisma.adminUserPermission.findMany({
    where : { adminUserId: { in: superAdmins.map((a) => a.id) }, permissionId: { in: permissions.map((p) => p.id) } },
    select: { adminUserId: true, permissionId: true },
  })
  const existingKeys = new Set(existingGrants.map((g) => `${g.adminUserId}|${g.permissionId}`))

  const toCreate = superAdmins.flatMap((admin) =>
    permissions
      .filter((p) => !existingKeys.has(`${admin.id}|${p.id}`))
      .map((p) => ({ adminUserId: admin.id, permissionId: p.id, grantedById: admin.id })),
  )
  if (toCreate.length === 0) return 0

  await prisma.adminUserPermission.createMany({ data: toCreate })
  return toCreate.length
}
