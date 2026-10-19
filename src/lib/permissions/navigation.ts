import { hasAnyPermission, hasPermission } from "@/lib/permissions"
import type { FeatureFlagKey, Permission } from "@/types/domain"

export type NavItem = {
  href: string
  key: string
  permission?: Permission
  anyPermission?: readonly Permission[]
  feature?: FeatureFlagKey
}

export const MAIN_NAV: readonly NavItem[] = [
  { href: "/dashboard", key: "dashboard", permission: "project:read" },
  { href: "/projects", key: "projects", permission: "project:read" },
  { href: "/tasks", key: "tasks", permission: "task:read" },
  { href: "/notifications", key: "notifications", feature: "FEATURE_NOTIFICATIONS" },
  { href: "/reports", key: "reports", permission: "report:view", feature: "FEATURE_ANALYTICS" },
  { href: "/assistant", key: "assistant", feature: "FEATURE_AI_ASSISTANT" },
  { href: "/settings", key: "settings", permission: "settings:read" },
]

export const ADMIN_NAV: readonly NavItem[] = [
  { href: "/admin/users", key: "users", anyPermission: ["user:invite", "user:update", "user:remove"] },
  { href: "/admin/roles", key: "roles", permission: "user:update" },
  { href: "/admin/permissions", key: "permissions", permission: "user:update" },
  { href: "/admin/feature-flags", key: "featureFlags", permission: "feature_flag:read" },
  { href: "/admin/configuration", key: "configuration", permission: "settings:update" },
  { href: "/admin/audit-logs", key: "auditLogs", permission: "audit:view" },
]

export function canSeeNav(
  permissions: readonly Permission[],
  features: Partial<Record<FeatureFlagKey, boolean>>,
  item: NavItem,
) {
  if (item.feature && !features[item.feature]) return false
  if (item.anyPermission && !hasAnyPermission(permissions, item.anyPermission)) return false
  if (item.permission && !hasPermission(permissions, item.permission)) return false
  return true
}

export function visibleNavigation(
  permissions: readonly Permission[],
  features: Partial<Record<FeatureFlagKey, boolean>>,
) {
  return {
    main: MAIN_NAV.filter((item) => canSeeNav(permissions, features, item)),
    admin: ADMIN_NAV.filter((item) => canSeeNav(permissions, features, item)),
  }
}
