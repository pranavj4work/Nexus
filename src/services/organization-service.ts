import { simulateLatency } from "@/lib/delay"
import { AppError } from "@/lib/api/errors"
import { hashPassword } from "@/lib/auth/password"
import { createId, createSecret, hashToken } from "@/lib/ids"
import { paginate } from "@/lib/pagination"
import { authorize } from "@/lib/permissions/authorize"
import { ADMIN_NAV, canSeeNav } from "@/lib/permissions/navigation"
import { assertRateLimit } from "@/lib/rate-limit/rate-limit-service"
import { findMembership, findUserByEmail, findUserById, featureMap, getConfigNumber, isFeatureEnabled } from "@/repositories/access"
import { getDb } from "@/repositories/store"
import { pushNotification, recordAudit } from "@/services/activity"
import type { Permission, RequestContext, User, UserStatus } from "@/types/domain"

export async function listUsers(
  ctx: RequestContext,
  query: { page?: number; pageSize?: number; search?: string; status?: UserStatus; roleId?: string },
) {
  await simulateLatency()
  authorize(ctx, "user:read")
  const search = query.search?.trim().toLowerCase()
  const rows = getDb()
    .memberships.filter((membership) => membership.organizationId === ctx.organizationId)
    .map((membership) => {
      const user = findUserById(membership.userId)
      if (!user) return null
      return { membership, user }
    })
    .filter((row) => row !== null)
    .filter((row) => (query.status ? row.membership.status === query.status : true))
    .filter((row) => (query.roleId ? row.membership.roleIds.includes(query.roleId) : true))
    .filter((row) => (search ? `${row.user.name} ${row.user.email} ${row.user.title}`.toLowerCase().includes(search) : true))
    .sort((left, right) => left.user.name.localeCompare(right.user.name))
    .map((row) => ({
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      title: row.user.title,
      initials: row.user.initials,
      status: row.membership.status,
      roleIds: row.membership.roleIds,
      joinedAt: row.membership.joinedAt,
    }))
  return paginate(rows, query.page, query.pageSize)
}

export async function inviteUser(ctx: RequestContext, input: { name: string; email: string; roleId: string }) {
  await simulateLatency()
  authorize(ctx, "user:invite")
  const role = getDb().roles.find((item) => item.id === input.roleId)
  if (!role || role.key === "SUPER_ADMIN") throw new AppError("VALIDATION", "validation.invalid", { roleId: "validation.role" })
  const db = getDb()
  let user = findUserByEmail(input.email)
  const now = new Date().toISOString()
  if (!user) {
    const min = getConfigNumber("AUTH_PASSWORD_MIN_LENGTH")
    user = {
      id: createId("usr"),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: hashPassword(`Invite${min}!`),
      status: "INVITED",
      title: "Member",
      initials: input.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      emailVerified: false,
      locale: "en",
      theme: "system",
      highContrast: false,
      createdAt: now,
      updatedAt: now,
    } satisfies User
    db.users.unshift(user)
  }
  if (findMembership(user.id, ctx.organizationId)) throw new AppError("CONFLICT", "This person is already in the organization.")
  db.memberships.unshift({
    id: createId("mem"),
    userId: user.id,
    organizationId: ctx.organizationId,
    roleIds: [role.id],
    status: "INVITED",
    joinedAt: now,
  })
  const token = createSecret()
  db.authTokens.unshift({
    id: createId("tok"),
    userId: user.id,
    tokenHash: hashToken(token),
    purpose: "reset",
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    usedAt: null,
  })
  pushNotification({
    organizationId: ctx.organizationId,
    userId: user.id,
    type: "USER_INVITED",
    title: "You were invited",
    message: `${ctx.user.name} invited you to the organization.`,
    metadata: {},
  })
  recordAudit(ctx, "USER_INVITED", "USER", user.id, { email: user.email, role: role.key })
  return { userId: user.id, devResetPath: `/reset-password?token=${token}` }
}

export async function updateMember(
  ctx: RequestContext,
  userId: string,
  input: { roleId?: string; status?: UserStatus; name?: string; title?: string },
) {
  await simulateLatency()
  authorize(ctx, "user:update")
  if (userId === ctx.user.id) throw new AppError("CONFLICT", "You cannot change your own membership.")
  const membership = findMembership(userId, ctx.organizationId)
  const user = findUserById(userId)
  if (!membership || !user) throw new AppError("NOT_FOUND", "Member not found.")
  if (input.roleId) {
    const role = getDb().roles.find((item) => item.id === input.roleId)
    if (!role || role.key === "SUPER_ADMIN") throw new AppError("VALIDATION", "validation.invalid", { roleId: "validation.role" })
    const previous = membership.roleIds[0] ?? ""
    membership.roleIds = [role.id]
    recordAudit(ctx, "USER_ROLE_CHANGED", "USER", user.id, { oldRole: previous, newRole: role.id })
  }
  if (input.status) membership.status = input.status
  if (input.name) user.name = input.name
  if (input.title) user.title = input.title
  user.updatedAt = new Date().toISOString()
  return membership
}

export async function removeMember(ctx: RequestContext, userId: string) {
  await simulateLatency()
  authorize(ctx, "user:remove")
  if (userId === ctx.user.id) throw new AppError("CONFLICT", "You cannot remove yourself.")
  const db = getDb()
  const membership = findMembership(userId, ctx.organizationId)
  if (!membership) throw new AppError("NOT_FOUND", "Member not found.")
  db.memberships = db.memberships.filter((item) => item.id !== membership.id)
  for (const project of db.projects.filter((project) => project.organizationId === ctx.organizationId)) {
    project.memberIds = project.memberIds.filter((id) => id !== userId)
  }
}

export async function listNotifications(ctx: RequestContext, identity: string) {
  await simulateLatency()
  assertRateLimit("notificationPoll", identity)
  if (!isFeatureEnabled(ctx.organizationId, "FEATURE_NOTIFICATIONS")) {
    return { items: [], unread: 0 }
  }
  const items = getDb()
    .notifications.filter((item) => item.organizationId === ctx.organizationId && item.userId === ctx.user.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  return { items, unread: items.filter((item) => !item.read).length }
}

export async function markNotificationRead(ctx: RequestContext, notificationId: string) {
  await simulateLatency()
  const notification = getDb().notifications.find(
    (item) => item.id === notificationId && item.organizationId === ctx.organizationId && item.userId === ctx.user.id,
  )
  if (!notification) throw new AppError("NOT_FOUND", "Notification not found.")
  notification.read = true
  return notification
}

export async function markAllNotificationsRead(ctx: RequestContext) {
  await simulateLatency()
  for (const notification of getDb().notifications) {
    if (notification.organizationId === ctx.organizationId && notification.userId === ctx.user.id) notification.read = true
  }
}

export async function deleteNotification(ctx: RequestContext, notificationId: string) {
  await simulateLatency()
  const db = getDb()
  const notification = db.notifications.find(
    (item) => item.id === notificationId && item.organizationId === ctx.organizationId && item.userId === ctx.user.id,
  )
  if (!notification) throw new AppError("NOT_FOUND", "Notification not found.")
  db.notifications = db.notifications.filter((item) => item.id !== notificationId)
}

export async function searchAll(ctx: RequestContext, query: string, identity: string) {
  await simulateLatency()
  assertRateLimit("search", identity)
  if (!isFeatureEnabled(ctx.organizationId, "FEATURE_GLOBAL_SEARCH")) {
    throw new AppError("FORBIDDEN", "This feature is not enabled for your organization.")
  }
  const term = query.trim().toLowerCase()
  if (term.length < 2) return { projects: [], tasks: [], users: [], settings: [] }
  const projects = ctx.permissions.includes("project:read")
    ? getDb()
        .projects.filter((project) => project.organizationId === ctx.organizationId && project.name.toLowerCase().includes(term))
        .slice(0, 5)
        .map((project) => ({ id: project.id, title: project.name, href: `/projects/${project.id}` }))
    : []
  const tasks = ctx.permissions.includes("task:read")
    ? getDb()
        .tasks.filter((task) => task.organizationId === ctx.organizationId && task.title.toLowerCase().includes(term))
        .slice(0, 5)
        .map((task) => ({ id: task.id, title: task.title, href: `/projects/${task.projectId}/tasks?task=${task.id}` }))
    : []
  const usersNav = ADMIN_NAV.find((item) => item.href === "/admin/users")
  const users =
    usersNav && canSeeNav(ctx.permissions, featureMap(ctx.organizationId), usersNav)
      ? getDb()
          .memberships.filter((membership) => membership.organizationId === ctx.organizationId)
          .map((membership) => findUserById(membership.userId))
          .filter((user) => user && `${user.name} ${user.email}`.toLowerCase().includes(term))
          .slice(0, 5)
          .map((user) => ({ id: user!.id, title: user!.name, href: `/admin/users?search=${encodeURIComponent(user!.name)}` }))
      : []
  const settings = [
    { id: "profile", key: "profile", titleKey: "settings.profile", href: "/settings", permission: "settings:read" as Permission, keywords: "profile account settings" },
    { id: "security", key: "security", titleKey: "settings.security", href: "/settings/security", permission: "settings:read" as Permission, keywords: "authentication security sessions password" },
    { id: "notifications", key: "notifications", titleKey: "settings.notifications", href: "/settings", permission: "settings:read" as Permission, keywords: "notification preferences digest" },
    { id: "users", key: "users", titleKey: "nav.users", href: "/admin/users", anyPermission: ["user:invite", "user:update", "user:remove"] as const, keywords: "users members invite" },
    { id: "roles", key: "roles", titleKey: "nav.roles", href: "/admin/roles", permission: "user:update" as Permission, keywords: "roles access" },
    { id: "permissions", key: "permissions", titleKey: "nav.permissions", href: "/admin/permissions", permission: "user:update" as Permission, keywords: "permissions access" },
    { id: "flags", key: "featureFlags", titleKey: "nav.featureFlags", href: "/admin/feature-flags", permission: "feature_flag:read" as Permission, keywords: "feature flags" },
    { id: "configuration", key: "configuration", titleKey: "nav.configuration", href: "/admin/configuration", permission: "settings:update" as Permission, keywords: "configuration system settings" },
    { id: "audit", key: "auditLogs", titleKey: "nav.auditLogs", href: "/admin/audit-logs", permission: "audit:view" as Permission, keywords: "audit logs" },
  ].filter(
    (item) =>
      canSeeNav(ctx.permissions, featureMap(ctx.organizationId), item) &&
      `${item.keywords} ${item.titleKey}`.toLowerCase().includes(term),
  )
  return { projects, tasks, users, settings: settings.slice(0, 5) }
}

export async function listAudit(
  ctx: RequestContext,
  query: { page?: number; pageSize?: number; search?: string; action?: string; userId?: string; resource?: string; from?: string; to?: string },
) {
  await simulateLatency()
  authorize(ctx, "audit:view")
  const search = query.search?.trim().toLowerCase()
  let items = getDb().auditLogs.filter((item) => item.organizationId === ctx.organizationId)
  if (query.action) items = items.filter((item) => item.action === query.action)
  if (query.userId) items = items.filter((item) => item.userId === query.userId)
  if (query.resource) items = items.filter((item) => item.resource === query.resource)
  if (query.from) items = items.filter((item) => item.timestamp >= query.from!)
  if (query.to) items = items.filter((item) => item.timestamp <= `${query.to}T23:59:59.999Z`)
  if (search) {
    items = items.filter((item) => `${item.action} ${item.resource} ${item.resourceId} ${JSON.stringify(item.metadata)}`.toLowerCase().includes(search))
  }
  items.sort((left, right) => right.timestamp.localeCompare(left.timestamp))
  return paginate(items, query.page, query.pageSize)
}

export async function listFlags(ctx: RequestContext) {
  await simulateLatency()
  authorize(ctx, "feature_flag:read")
  return getDb().featureFlags
}

export async function updateFlag(ctx: RequestContext, flagId: string, input: { enabled: boolean; organizationIds: string[] }) {
  await simulateLatency()
  authorize(ctx, "feature_flag:update")
  const flag = getDb().featureFlags.find((item) => item.id === flagId)
  if (!flag) throw new AppError("NOT_FOUND", "Feature flag not found.")
  flag.enabled = input.enabled
  flag.organizationIds = input.organizationIds
  flag.updatedBy = ctx.user.id
  flag.updatedAt = new Date().toISOString()
  recordAudit(ctx, "FEATURE_FLAG_CHANGED", "FEATURE_FLAG", flag.id, { key: flag.key, enabled: String(flag.enabled) })
  return flag
}

export async function listConfig(ctx: RequestContext) {
  await simulateLatency()
  authorize(ctx, "settings:update")
  return getDb().systemConfig
}

export async function updateConfig(ctx: RequestContext, key: string, value: string | number | boolean) {
  await simulateLatency()
  authorize(ctx, "settings:update")
  const item = getDb().systemConfig.find((config) => config.key === key)
  if (!item) throw new AppError("NOT_FOUND", "Configuration not found.")
  if (item.type === "NUMBER" && typeof value !== "number") throw new AppError("VALIDATION", "validation.invalid", { value: "validation.number" })
  if (item.type === "BOOLEAN" && typeof value !== "boolean") throw new AppError("VALIDATION", "validation.invalid", { value: "validation.boolean" })
  if (item.type === "STRING" && typeof value !== "string") throw new AppError("VALIDATION", "validation.invalid", { value: "validation.string" })
  item.value = value
  item.updatedBy = ctx.user.id
  item.updatedAt = new Date().toISOString()
  recordAudit(ctx, "SETTINGS_UPDATED", "CONFIGURATION", key, { value: String(value) })
  return item
}

export async function listRoles(ctx: RequestContext) {
  await simulateLatency()
  authorize(ctx, "user:read")
  return getDb().roles
}

export async function updateRolePermissions(ctx: RequestContext, roleId: string, permissions: Permission[]) {
  await simulateLatency()
  authorize(ctx, "user:update")
  const role = getDb().roles.find((item) => item.id === roleId)
  if (!role) throw new AppError("NOT_FOUND", "Role not found.")
  if (role.key === "SUPER_ADMIN") throw new AppError("FORBIDDEN", "Super Admin permissions cannot be changed.")
  role.permissions = [...new Set(permissions)]
  recordAudit(ctx, "SETTINGS_UPDATED", "ROLE", role.id, { key: role.key, permissions: role.permissions.join(",") })
  return role
}

export async function listPermissions(ctx: RequestContext) {
  await simulateLatency()
  authorize(ctx, "user:read")
  return getDb().permissions
}

export function publicAuthConfig() {
  return {
    passwordMinLength: getConfigNumber("AUTH_PASSWORD_MIN_LENGTH"),
    mfaRequired: isFeatureEnabledSafe(),
  }
}

function isFeatureEnabledSafe() {
  return getDb().systemConfig.find((item) => item.key === "AUTH_MFA_REQUIRED")?.value === true
}

export async function projectActivity(ctx: RequestContext, projectId: string) {
  await simulateLatency()
  authorize(ctx, "project:read")
  const project = getDb().projects.find((item) => item.id === projectId && item.organizationId === ctx.organizationId)
  if (!project) throw new AppError("NOT_FOUND", "Project not found.")
  const taskIds = new Set(getDb().tasks.filter((task) => task.projectId === projectId).map((task) => task.id))
  return getDb()
    .auditLogs.filter(
      (item) =>
        item.organizationId === ctx.organizationId &&
        (item.resourceId === projectId || taskIds.has(item.resourceId)),
    )
    .slice(0, 40)
}
