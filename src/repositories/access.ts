import { getDb } from "@/repositories/store"
import type { FeatureFlagKey, Permission, PublicUser, Role, RoleKey, User } from "@/types/domain"

export function toPublicUser(user: User): PublicUser {
  const { passwordHash, ...publicUser } = user
  void passwordHash
  return publicUser
}

export function findUserByEmail(email: string) {
  return getDb().users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null
}

export function findUserById(id: string) {
  return getDb().users.find((user) => user.id === id) ?? null
}

export function activeMemberships(userId: string) {
  return getDb().memberships.filter((membership) => membership.userId === userId && membership.status === "ACTIVE")
}

export function findMembership(userId: string, organizationId: string) {
  return (
    getDb().memberships.find(
      (membership) => membership.userId === userId && membership.organizationId === organizationId,
    ) ?? null
  )
}

export function isSuperAdmin(userId: string) {
  const roles = new Map(getDb().roles.map((role) => [role.id, role]))
  return activeMemberships(userId).some((membership) =>
    membership.roleIds.some((roleId) => roles.get(roleId)?.key === "SUPER_ADMIN"),
  )
}

export function resolveMembershipAccess(roleIds: string[]) {
  const roles = getDb().roles.filter((role) => roleIds.includes(role.id))
  const permissions = [...new Set(roles.flatMap((role) => role.permissions))] as Permission[]
  const roleKeys = roles.map((role) => role.key) as RoleKey[]
  return { roles: roles as Role[], permissions, roleKeys }
}

export function canAccessOrganization(userId: string, organizationId: string) {
  if (isSuperAdmin(userId)) return getDb().organizations.some((organization) => organization.id === organizationId)
  const membership = findMembership(userId, organizationId)
  return membership?.status === "ACTIVE"
}

export function organizationsForUser(userId: string) {
  const db = getDb()
  if (isSuperAdmin(userId)) return [...db.organizations]
  const ids = new Set(activeMemberships(userId).map((membership) => membership.organizationId))
  return db.organizations.filter((organization) => ids.has(organization.id))
}

export function getConfigValue(key: string) {
  const item = getDb().systemConfig.find((config) => config.key === key)
  if (!item) throw new Error(`Missing configuration ${key}`)
  return item.value
}

export function getConfigNumber(key: string) {
  const value = getConfigValue(key)
  return typeof value === "number" ? value : Number(value)
}

export function getConfigBoolean(key: string) {
  const value = getConfigValue(key)
  return value === true || value === "true"
}

export function getConfigString(key: string) {
  return String(getConfigValue(key))
}

export function isFeatureEnabled(organizationId: string, key: FeatureFlagKey) {
  const flag = getDb().featureFlags.find((item) => item.key === key)
  if (!flag?.enabled) return false
  return flag.organizationIds.includes(organizationId)
}

export function featureMap(organizationId: string) {
  return Object.fromEntries(
    getDb().featureFlags.map((flag) => [flag.key, isFeatureEnabled(organizationId, flag.key)]),
  ) as Record<FeatureFlagKey, boolean>
}
