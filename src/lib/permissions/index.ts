import type { Permission } from "@/types/domain"

export function hasPermission(permissions: readonly Permission[], permission: Permission) {
  return permissions.includes(permission)
}

export function hasAnyPermission(permissions: readonly Permission[], required: readonly Permission[]) {
  return required.some((permission) => permissions.includes(permission))
}

export function hasAllPermissions(permissions: readonly Permission[], required: readonly Permission[]) {
  return required.every((permission) => permissions.includes(permission))
}
