import { AppError } from "@/lib/api/errors"
import { hasAllPermissions, hasAnyPermission, hasPermission } from "@/lib/permissions"
import type { Permission, RequestContext } from "@/types/domain"

export function authorize(ctx: RequestContext, permission: Permission) {
  if (!hasPermission(ctx.permissions, permission)) {
    throw new AppError("FORBIDDEN", "You do not have permission to perform this action.")
  }
}

export function authorizeAny(ctx: RequestContext, permissions: Permission[]) {
  if (!hasAnyPermission(ctx.permissions, permissions)) {
    throw new AppError("FORBIDDEN", "You do not have permission to perform this action.")
  }
}

export function authorizeAll(ctx: RequestContext, permissions: Permission[]) {
  if (!hasAllPermissions(ctx.permissions, permissions)) {
    throw new AppError("FORBIDDEN", "You do not have permission to perform this action.")
  }
}
